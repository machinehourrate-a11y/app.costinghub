
import React, { useState } from 'react';
import type { FeedbackPageProps } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DisplayField } from '../components/ui/DisplayField';

const USAGE_DURATIONS = [
  "I'm just getting started (< 1 week)",
  "A few weeks (1-4 weeks)",
  "A few months (1-3 months)",
  "A long time (> 3 months)"
];

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ user, onSubmit }) => {
  const [usageDuration, setUsageDuration] = useState(USAGE_DURATIONS[0]);
  const [usageExperience, setUsageExperience] = useState('');
  const [featureRequests, setFeatureRequests] = useState('');
  const [suggestedChanges, setSuggestedChanges] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        usage_duration: usageDuration,
        usage_experience: usageExperience,
        feature_requests: featureRequests,
        suggested_changes: suggestedChanges,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in text-center">
        <Card>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-primary mb-2">Thank You!</h2>
          <p className="text-text-secondary">Your feedback has been submitted successfully. We appreciate you taking the time to help us improve CostingHub.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-fade-in">
      <Card>
        <h2 className="text-2xl font-semibold text-primary border-b border-border pb-3 mb-6">Submit Feedback & Requests</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DisplayField label="User Email" value={user.email} />

          <Select
            label="How long have you been using our app?"
            value={usageDuration}
            onChange={(e) => setUsageDuration(e.target.value)}
          >
            {USAGE_DURATIONS.map(duration => (
              <option key={duration} value={duration}>{duration}</option>
            ))}
          </Select>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              How would you describe your experience using the app?
            </label>
            <textarea
              value={usageExperience}
              onChange={(e) => setUsageExperience(e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
              placeholder="What do you like? What's frustrating?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              What new features would you like to see?
            </label>
            <textarea
              value={featureRequests}
              onChange={(e) => setFeatureRequests(e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
              placeholder="Describe any new tools, calculators, or functionalities you need."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Are there any changes you would suggest for the existing app?
            </label>
            <textarea
              value={suggestedChanges}
              onChange={(e) => setSuggestedChanges(e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm bg-background/50 text-text-input border-border placeholder-text-muted focus:ring-primary focus:border-primary"
              placeholder="Suggestions for UI improvements, workflow changes, etc."
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
