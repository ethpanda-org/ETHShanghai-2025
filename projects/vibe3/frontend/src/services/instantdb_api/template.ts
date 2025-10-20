export const schema = `
// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    "$files": i.entity({
      "path": i.string().unique().indexed(),
      "url": i.string().optional(),
    }),
    "$users": i.entity({
      "email": i.string().unique().indexed().optional(),
      "type": i.string().optional(),
    }),
  },
  links: {},
  rooms: {}
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema }
export default schema;
 `;

export const permissions = `
// instant.perms.ts
import { type InstantRules } from '@instantdb/react';

const rules = {
    "$files": {
        "allow": {
        "view": "true",
        "create": "true",
        "delete": "true"
        }
    }
} satisfies InstantRules;

export default rules;
 `;

export const index = `
import { init } from '@instantdb/react';
import schema from './instant.schema';

export function createDb(appId: string) {
  return init({
    appId: appId,
    schema
  });
}

const db = createDb(import.meta.env.VITE_INSTANT_APP_ID!);

export type InstantDb = ReturnType<typeof createDb>;

export default db
`;
