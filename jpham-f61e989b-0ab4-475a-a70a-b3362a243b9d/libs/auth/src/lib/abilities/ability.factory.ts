import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { IUser } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subject = 'Task' | 'User' | 'AuditLog' | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

export function defineAbilitiesFor(user: IUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (user.role) {
    case 'owner':
      can('manage', 'all');
      break;

    case 'admin':
      can(['create', 'read', 'update', 'delete'], 'Task');
      can('read', 'AuditLog');
      can('read', 'User');
      break;

    case 'viewer':
      can('read', 'Task');
      break;
  }

  return build();
}
