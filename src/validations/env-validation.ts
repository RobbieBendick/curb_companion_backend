import assert from 'assert';
import {
  defaultEnvVars,
  requiredDevEnvVars,
  requiredEnvVars,
  requiredProdEnvVars,
  requiredTestEnvVars,
} from '../config/env.config.json';
import Logger from '../config/log';
import { deepEquals } from '../shared/helpers/helpers';

function validate(fieldName: string) {
  const value: any = process.env[fieldName];
  if (value === undefined) {
    return `${fieldName} is not defined`;
  }
  return value;
}

export default function validateEnv() {
  const namespace: string = 'env-validation';

  const validated: any = {};
  try {
    Logger.info('Validating environment', { namespace });
    assert(process.env.NODE_ENV, 'NODE_ENV is not defined');
    if (process.env.NODE_ENV === 'test') {
      requiredTestEnvVars.forEach((key) => {
        validated[key] = validate(key);
      });
    } else if (process.env.NODE_ENV === 'development') {
      requiredDevEnvVars.forEach((key) => {
        validated[key] = validate(key);
      });
    } else {
      requiredProdEnvVars.forEach((key) => {
        validated[key] = validate(key);
      });
    }
    requiredEnvVars.forEach((key) => {
      validated[key] = validate(key);
    });

    if (!deepEquals(process.env, validated)) {
      const missingInEnv: any = [];
      const missingInConfig: any = [];
      for (const key of Object.keys({ ...process.env, ...validated })) {
        if (defaultEnvVars.includes(key)) continue;
        else if (validated[key] === undefined) {
          missingInConfig.push(key);
        } else if (validated[key].includes('is not defined')) {
          missingInEnv.push(key);
        }
      }
      if (missingInConfig.length > 0) {
        Logger.warn(
          `Some environment variables were missing in the validation config and are not being validated: ${JSON.stringify(
            missingInConfig
          )}`,
          {
            namespace,
          }
        );
      }
      if (missingInEnv.length > 0) {
        Logger.error(
          `Validation failed due to some environment variables missing in .env: ${JSON.stringify(missingInEnv)}`,
          { namespace }
        );
        process.exit(1);
      }
    }

    Logger.info('Environment validation passed', { namespace });
  } catch (error: any) {
    Logger.error(`Environment validation failed: ${error.message}`, { namespace });
    process.exit(1);
  }
}
