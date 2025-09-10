// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.

 @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  // Rapido Partner Integration Documentation
  tutorialSidebar: [
    // Getting Started
    'intro',
    'overview',
    'quickstart',
    
    // Integration Guide
    {
      type: 'category',
      label: 'Integration Guide',
      items: [
        'integration/basics',
        'integration/javascript-bridge',
        'integration/events-tracking',
      ],
      collapsed: false,
    },
    
    // API Reference
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
        'api/token-validation',
        'api/examples',
      ],
      collapsed: false,
    },
    
    // // Analytics
    // {
    //   type: 'category',
    //   label: 'Analytics',
    //   items: [
    //     'analytics/overview',
    //     'analytics/event-tracking',
    //     'analytics/booking-funnel',
    //     'analytics/privacy-consent',
    //     'analytics/dashboard',
    //   ],
    //   collapsed: false,
    // },
    
    // Security & Best Practices
    'security',
    
    // Support & Troubleshooting
    'faq',
    'troubleshooting',
  ],
};

export default sidebars;
