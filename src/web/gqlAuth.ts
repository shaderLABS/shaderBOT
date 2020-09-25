import { Permissions } from 'discord.js';

export function authChecker({ context: { req } }: { context: any }, roles: any[]) {
    if (!req.user) return false;

    if (roles) {
        const permissions = roles.filter((role) => role.startsWith('P_'));
        if (permissions.length !== 0) {
            if (!req.user.permissions) return false;
            const userPermissions = new Permissions(req.user.permissions);

            for (const permission of permissions) {
                if (!userPermissions.toArray().includes(permission.substring(2))) return false;
            }
        }

        const roleIDs = roles.filter((role) => role.startsWith('R_'));
        if (roleIDs.length !== 0) {
            if (!req.user.allRoles) return false;
            const userRoleIDs = req.user.allRoles.map((role: any) => role.id);

            for (const roleID of roleIDs) {
                if (!userRoleIDs.includes(roleID.substring(2))) return false;
            }
        }
    }

    return true;
}
