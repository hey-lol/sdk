export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'buffer',
              message: 'Buffer is not available in edge runtimes. Use Uint8Array instead.',
            },
            {
              name: 'node:buffer',
              message: 'Buffer is not available in edge runtimes. Use Uint8Array instead.',
            },
            {
              name: 'crypto',
              message: 'Node.js crypto is not available in edge runtimes. Use @noble/curves instead.',
            },
            {
              name: 'node:crypto',
              message: 'Node.js crypto is not available in edge runtimes. Use @noble/curves instead.',
            },
            {
              name: 'process',
              message: 'process is not available in edge runtimes. Pass config explicitly.',
            },
            {
              name: 'node:process',
              message: 'process is not available in edge runtimes. Pass config explicitly.',
            },
          ],
        },
      ],
    },
  },
];
