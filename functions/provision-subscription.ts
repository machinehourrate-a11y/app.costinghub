
import { createClient } from "@supabase/supabase-js";

// Define the structure of the incoming webhook payload
interface WebhookPayload {
  user_email: string;
  plan: "Free" | "Standard" | "Pro" | "Team";
  expiry_date: string; // ISO 8601 format
  payment_id: string;
}

// Define plan specifications, including limits and features
const PLAN_SPECS = {
  Free: {
    calculation_limit: 5,
    features: { can_export_pdf: false, can_export_excel: false, can_use_cnc_costing: true, can_use_should_costing: false, can_manage_team: false, max_team_members: 0 },
  },
  Standard: {
    calculation_limit: 50,
    features: { can_export_pdf: true, can_export_excel: false, can_use_cnc_costing: true, can_use_should_costing: true, can_manage_team: false, max_team_members: 0 },
  },
  Pro: {
    calculation_limit: -1, // Unlimited
    features: { can_export_pdf: true, can_export_excel: true, can_use_cnc_costing: true, can_use_should_costing: true, can_manage_team: false, max_team_members: 0 },
  },
  Team: {
    calculation_limit: -1, // Unlimited
    features: { can_export_pdf: true, can_export_excel: true, can_use_cnc_costing: true, can_use_should_costing: true, can_manage_team: true, max_team_members: 5 },
  },
};

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MARKETING_WEBHOOK_SECRET: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  // 1. Verify the webhook secret
  const authHeader = request.headers.get("Authorization");
  const providedSecret = authHeader?.split("Bearer ")[1];
  
  if (!providedSecret || providedSecret !== env.MARKETING_WEBHOOK_SECRET) {
    console.warn("Unauthorized webhook attempt.");
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse the incoming payload
  let payload: WebhookPayload;
  try {
    payload = await request.json();
    if (!payload.user_email || !payload.plan || !payload.expiry_date) {
      throw new Error("Missing required fields in webhook payload.");
    }
  } catch (err) {
    console.error("Invalid webhook payload:", err);
    return new Response("Invalid payload", { status: 400 });
  }

  try {
    // 3. Initialize Supabase client with the Service Role Key from Env
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables are not set.");
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 4. Map plan name to its specifications
    const planSpec = PLAN_SPECS[payload.plan];
    if (!planSpec) {
      throw new Error(`Invalid plan name received: ${payload.plan}`);
    }

    // 5. Find the user and update their profile
    // This operation uses the service role key to bypass RLS.
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", payload.user_email)
      .single();

    if (userError || !user) {
      throw new Error(`User with email ${payload.user_email} not found.`);
    }
    
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan_name: payload.plan,
        subscription_status: "active",
        subscription_expires_on: payload.expiry_date,
        calculation_limit: planSpec.calculation_limit,
        features: planSpec.features,
        // Reset usage counters upon plan update
        calculations_used: 0, 
        usage_reset_on: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(`Supabase update failed: ${updateError.message}`);
    }

    // 6. Return a success response
    return new Response(JSON.stringify({ status: "ok", message: `User ${payload.user_email} updated successfully.` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Webhook processing error:", err.message);
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
  }
};
