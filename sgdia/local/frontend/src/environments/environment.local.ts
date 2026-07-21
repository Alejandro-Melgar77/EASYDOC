/**
 * Local standalone distribution. It intentionally uses ports different from
 * the main development stack so both environments can be available together.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8100/api',
  wsUrl: 'http://localhost:8100',
};
