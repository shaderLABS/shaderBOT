import mongoose from 'ts-mongoose';

export const ProjectSchema = mongoose.createSchema({
    _id: mongoose.Type.objectId({ required: true }),
    channel: mongoose.Type.string({ required: true }),
    owners: mongoose.Type.array().of(mongoose.Type.string({ required: true })),
    pingRole: mongoose.Type.string({ required: true }),
});

export default mongoose.typedModel('Project', ProjectSchema);
