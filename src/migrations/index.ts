import * as migration_20261119_171717_initial_schema from './20261119_171717_initial_schema';
import * as migration_20261120_171819_assistant_chat from './20261120_171819_assistant_chat';
import * as migration_20261120_194003_assistant_model_catalog from './20261120_194003_assistant_model_catalog';
import * as migration_20261121_004035_native_content_access from './20261121_004035_native_content_access';

export const migrations = [
  {
    up: migration_20261119_171717_initial_schema.up,
    down: migration_20261119_171717_initial_schema.down,
    name: '20261119_171717_initial_schema',
  },
  {
    up: migration_20261120_171819_assistant_chat.up,
    down: migration_20261120_171819_assistant_chat.down,
    name: '20261120_171819_assistant_chat',
  },
  {
    up: migration_20261120_194003_assistant_model_catalog.up,
    down: migration_20261120_194003_assistant_model_catalog.down,
    name: '20261120_194003_assistant_model_catalog',
  },
  {
    up: migration_20261121_004035_native_content_access.up,
    down: migration_20261121_004035_native_content_access.down,
    name: '20261121_004035_native_content_access'
  },
];
