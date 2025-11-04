import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { SubscriptionPageProps, SubscriptionPlan, PriceInfo, RazorpayOptions } from '../types';

const formatPrice = (price: number, currency: string) => {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    } catch (e) {
        // Fallback for unsupported currencies or environments
        return `${currency} ${price}`;
    }
};

const PlanCard: React.FC<{ plan: SubscriptionPlan, userCurrency: string, onChoosePlan: () => void, isCurrent: boolean }> = ({ plan, userCurrency, onChoosePlan, isCurrent }) => {
    const prices = plan.prices as { [key: string]: PriceInfo } | null;
    const currency = (prices && Object.keys(prices).includes(userCurrency) ? userCurrency : 'USD');
    const priceInfo = prices ? (prices[currency] ?? prices.USD) : null;
    
    let displayPrice: React.ReactNode;
    let discountBadge: React.ReactNode | null = null;
    
    if (plan.is_custom_price) {
        displayPrice = "Contact Us";
    } else if (!priceInfo) {
        displayPrice = "N/A";
    } else if (priceInfo.price === 0) {
        displayPrice = "Free";
    } else {
        const salePriceFormatted = formatPrice(priceInfo.price, currency);
        
        if (priceInfo.displayPrice && priceInfo.displayPrice > priceInfo.price) {
            const originalPriceFormatted = formatPrice(priceInfo.displayPrice, currency);
            const discount = Math.round(((priceInfo.displayPrice - priceInfo.price) / priceInfo.displayPrice) * 100);
            discountBadge = <span className="absolute text-center text-xs font-bold bg-green-500 text-white py-1 px-3 rounded-full top-10 right-4 transform -translate-y-1/2">Save {discount}%</span>
            displayPrice = (
                <div className="flex items-baseline justify-center space-x-2">
                    <span>{salePriceFormatted}</span>
                    <span className="text-xl text-text-muted line-through">{originalPriceFormatted}</span>
                </div>
            )
        } else {
            displayPrice = salePriceFormatted;
        }
    }

    const buttonText = isCurrent ? 'Your Current Plan' : plan.cta;
    const isDisabled = isCurrent || plan.is_custom_price;

    return (
        <div className={`border rounded-lg p-6 flex flex-col relative transition-all duration-300 ${plan.most_popular && !isCurrent ? 'border-primary border-2 shadow-glow-primary' : 'border-border'} ${isCurrent ? 'bg-primary/10' : ''}`}>
            {plan.most_popular && !isCurrent && <span className="absolute text-center text-sm font-bold bg-primary text-white py-1 px-4 rounded-full -top-4 left-1/2 -translate-x-1/2">Most Popular</span>}
            {isCurrent && <span className="absolute text-center text-sm font-bold bg-primary text-white py-1 px-4 rounded-full -top-4 left-1/2 -translate-x-1/2">Current Plan</span>}
            {discountBadge}
            <h3 className="text-xl font-bold text-primary pt-4">{plan.name}</h3>
            <p className="text-4xl font-bold my-4 text-text-primary h-12 flex items-center justify-center">
                {displayPrice}
                {plan.period && !plan.is_custom_price && priceInfo && priceInfo.price > 0 && <span className="text-sm font-normal text-text-secondary ml-1">/{plan.period}</span>}
            </p>
            <ul className="space-y-2 text-text-secondary flex-grow">
                {plan.features.map(feature => (
                    <li key={feature} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            <Button className="mt-6 w-full" onClick={onChoosePlan} disabled={isDisabled}>{buttonText}</Button>
        </div>
    );
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ plans, user, isSuperAdmin, onUpgradePlan }) => {
  const isNewUser = !user.plan_id;

  const handlePayment = (plan: SubscriptionPlan) => {
    const prices = plan.prices as { [key: string]: PriceInfo } | null;
    if (!prices || !user) return;

    const currency = (prices && Object.keys(prices).includes(user.currency || 'USD') ? user.currency || 'USD' : 'USD');
    const priceInfo = prices[currency] ?? prices.USD;
    
    if (!priceInfo || priceInfo.price <= 0) return;

    const options: RazorpayOptions = {
      key: 'rzp_test_1DP5mmOlF5G5ag', // Standard Razorpay Test Key
      amount: (priceInfo.price * 100).toString(),
      currency: currency,
      name: 'CostingHub Pro',
      description: `Upgrade to ${plan.name} Plan`,
      // Replace with your company logo URL
      image: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/c-5-825313.png',
      handler: async (response) => {
        console.log('Payment successful:', response);
        // On successful payment, call the upgrade handler from App.tsx
        await onUpgradePlan(plan.id);
      },
      prefill: {
        name: user.name || '',
        email: user.email || '',
        contact: user.phone || '',
      },
      notes: {
        address: user.address || 'N/A',
      },
      theme: {
        color: '#8b5cf6', // Your brand's primary color
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      console.error('Payment failed:', response);
      let errorMessage = 'An unknown error occurred. Please try again.';
      if (response?.error) {
        if (typeof response.error.description === 'string' && response.error.description) {
          errorMessage = response.error.description;
        } else if (typeof response.error.reason === 'string' && response.error.reason) {
          // The 'reason' field often gives a concise, user-friendly error message.
          errorMessage = response.error.reason.replace(/_/g, ' ');
        }
      }
      // Capitalize the first letter for better presentation.
      errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
      alert(`Payment failed: ${errorMessage}`);
    });
    rzp.open();
  };
  
  const handleChoosePlan = (plan: SubscriptionPlan) => {
    // For free plans, directly upgrade without payment.
    if (plan.id === 'plan_001' || (!plan.is_custom_price && plan.prices && (plan.prices as any).USD.price === 0)) {
      onUpgradePlan(plan.id);
      return;
    }
    // For paid plans, initiate payment flow.
    if (!plan.is_custom_price && plan.prices) {
      handlePayment(plan);
      return;
    }
    // For enterprise plans, show contact info.
    if (plan.is_custom_price) {
      alert('Please contact sales@costinghub.com for Enterprise plan details.');
      return;
    }
  };

  if (isSuperAdmin) {
    return (
      <div className="w-full max-w-5xl mx-auto animate-fade-in">
        <Card>
          <div className="text-center p-8">
            <h2 className="text-3xl font-bold text-primary">Admin Access</h2>
            <p className="text-text-secondary mt-2">As a super admin, you have unlimited access to all features. No subscription plan is required.</p>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      <Card>
        <div className="text-center mb-10">
            {isNewUser ? (
                <>
                    <h2 className="text-3xl font-bold text-primary">Welcome to CostingHub!</h2>
                    <p className="text-text-secondary mt-2">To get started, please select a subscription plan below.</p>
                </>
            ) : (
                <>
                    <h2 className="text-3xl font-bold text-primary">Choose Your Plan</h2>
                    <p className="text-text-secondary mt-2">Select the plan that best fits your production needs.</p>
                </>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              userCurrency={user.currency || 'USD'}
              onChoosePlan={() => handleChoosePlan(plan)}
              isCurrent={plan.id === user.plan_id}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};
