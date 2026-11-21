import * as migration_20261119_171717_initial_schema from './20261119_171717_initial_schema';
import * as migration_20261120_171819_assistant_chat from './20261120_171819_assistant_chat';
import * as migration_20261120_194003_assistant_model_catalog from './20261120_194003_assistant_model_catalog';
import * as migration_20261121_004035_native_content_access from './20261121_004035_native_content_access';
import * as migration_20261121_010848_assistant from './20261121_010848_assistant';
import * as migration_20261121_012940_website_preview from './20261121_012940_website_preview';
import * as migration_20261121_130205_ai_connections from './20261121_130205_ai_connections';

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
    name: '20261121_004035_native_content_access',
  },
  {
    up: migration_20261121_010848_assistant.up,
    down: migration_20261121_010848_assistant.down,
    name: '20261121_010848_assistant',
  },
  {
    up: migration_20261121_012940_website_preview.up,
    down: migration_20261121_012940_website_preview.down,
    name: '20261121_012940_website_preview',
  },
  {
    up: migration_20261121_130205_ai_connections.up,
    down: migration_20261121_130205_ai_connections.down,
    name: '20261121_130205_ai_connections'
  },
];
