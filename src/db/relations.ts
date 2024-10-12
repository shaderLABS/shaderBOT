import { relations } from 'drizzle-orm/relations';
import { project, projectMute } from './schema.ts';

export const projectMuteRelations = relations(projectMute, ({ one }) => ({
    project: one(project, {
        fields: [projectMute.projectId],
        references: [project.id],
    }),
}));

export const projectRelations = relations(project, ({ many }) => ({
    projectMutes: many(projectMute),
}));
