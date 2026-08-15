// Generation of src/generated from openapi/company-v3.json. The output is committed.

// Resource-controller verbs of the operation ids, mapped to the vocabulary of the SDK.
const VERBS = {
  index: 'list',
  show: 'get',
  store: 'create',
  destroy: 'delete',
};

// Operations whose summary names a verb the map cannot reach, and two listings without an `index`.
const OVERRIDES = {
  'company.v3.attendance.store': ['attendance', 'record'],
  'company.v3.files.store': ['files', 'upload'],
  'company.v3.webhooks.secret': ['webhooks', 'rotateSecret'],
  'company.v3.payroll.payslips': ['payroll', 'payslips', 'list'],
  'company.v3.webhooks.events': ['webhooks', 'events', 'list'],
};

export default {
  // Object form: a bare string containing a slash is read as a Hey API registry shorthand.
  input: { path: './openapi/company-v3.json' },
  output: {
    path: 'src/generated',
    // Node ESM resolves an import literally, so the emitted extension must be in the import.
    importFileExtension: '.js',
  },
  plugins: [
    '@hey-api/client-fetch',
    {
      name: '@hey-api/sdk',
      operations: {
        strategy: 'single',
        containerName: 'Clockster',
        methods: 'instance',
        // Segments after `company.v3`; naming by the last one alone collapses two operations.
        nesting: (operation) => {
          if (OVERRIDES[operation.operationId]) {
            return OVERRIDES[operation.operationId];
          }

          const path = operation.operationId.split('.').slice(2);
          const last = path.length - 1;

          path[last] = VERBS[path[last]] ?? path[last];

          return path;
        },
      },
    },
  ],
};
