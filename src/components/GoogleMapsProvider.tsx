'use client';

import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { ReactNode } from 'react';

interface GoogleMapsProviderProps {
  children: ReactNode;
}

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">Loading Google Maps...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Failed to load Google Maps</p>
            <p className="text-sm text-gray-500">
              Please check your API key configuration
            </p>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
  }
};

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Google Maps API key not configured</p>
          <p className="text-sm text-gray-500">
            Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables
          </p>
        </div>
      </div>
    );
  }

  return (
    <Wrapper
      apiKey={apiKey}
      render={render}
      libraries={['places', 'geometry']}
    >
      {children}
    </Wrapper>
  );
}
