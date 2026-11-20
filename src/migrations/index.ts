import * as migration_20261119_171717_initial_schema from './20261119_171717_initial_schema';
import * as migration_20261120_171819_assistant_chat from './20261120_171819_assistant_chat';

export const migrations = [
  {
    up: migration_20261119_171717_initial_schema.up,
    down: migration_20261119_171717_initial_schema.down,
    name: '20261119_171717_initial_schema',
  },
  {
    up: migration_20261120_171819_assistant_chat.up,
    down: migration_20261120_171819_assistant_chat.down,
    name: '20261120_171819_assistant_chat'
  },
];
