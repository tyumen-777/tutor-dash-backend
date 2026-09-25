import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

const statement = {
  ...defaultStatements,
  students: ['create', 'read', 'update', 'delete'],
  lessons: ['create', 'read', 'update', 'delete'],
  finance: ['create', 'read', 'update', 'delete'],
  reports: ['read'],
  settings: ['read', 'update'],
} as const;

export const organizationAccessControl = createAccessControl(statement);

export const owner = organizationAccessControl.newRole({
  ...ownerAc.statements,
  students: ['create', 'read', 'update', 'delete'],
  lessons: ['create', 'read', 'update', 'delete'],
  finance: ['create', 'read', 'update', 'delete'],
  reports: ['read'],
  settings: ['read', 'update'],
});

export const admin = organizationAccessControl.newRole({
  ...adminAc.statements,
  students: ['create', 'read', 'update', 'delete'],
  lessons: ['create', 'read', 'update', 'delete'],
  finance: ['create', 'read', 'update', 'delete'],
  reports: ['read'],
  settings: ['read', 'update'],
});

export const manager = organizationAccessControl.newRole({
  ...memberAc.statements,
  students: ['create', 'read', 'update'],
  lessons: ['create', 'read', 'update'],
  finance: ['read'],
  reports: ['read'],
  settings: ['read'],
});

export const teacher = organizationAccessControl.newRole({
  ...memberAc.statements,
  students: ['read'],
  lessons: ['read', 'update'],
  finance: [],
  reports: [],
  settings: [],
});

export const accountant = organizationAccessControl.newRole({
  ...memberAc.statements,
  students: ['read'],
  lessons: ['read'],
  finance: ['create', 'read', 'update', 'delete'],
  reports: ['read'],
  settings: [],
});
