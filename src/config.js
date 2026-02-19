import Conf from 'conf';

const config = new Conf({ projectName: '@ktmcp-cli/adobe' });

export function getConfig(key) {
  return config.get(key);
}

export function setConfig(key, value) {
  config.set(key, value);
}

export function isConfigured() {
  return !!config.get('username') && !!config.get('password');
}

export function getAllConfig() {
  return config.store;
}
