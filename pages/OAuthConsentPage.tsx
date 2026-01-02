import React from 'react';
import { Card } from '../components/ui/Card';

export const OAuthConsentPage: React.FC = () => {
  return (
    <div className="w-full max-w-lg mx-auto py-12 md:py-24 animate-fade-in">
      <Card>
        <div className="text-center p-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-primary mt-4">
            Application Authorization
          </h1>
          <p className="text-text-secondary mt-4">
            This is the application's designated endpoint for handling OAuth 2.0 consent screens. 
          </p>
          <p className="text-text-secondary mt-2 text-sm">
            If you've been directed here, it means the authorization flow has started correctly. No further action is needed on this page if you are a user. Developers should implement their custom consent UI here.
          </p>
        </div>
      </Card>
    </div>
  );
};