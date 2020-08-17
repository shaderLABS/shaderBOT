import mongoose from 'ts-mongoose';

const CommentSchema = mongoose.createSchema({
    author: {
        username: mongoose.Type.string({ required: true }),
        discriminator: mongoose.Type.string({ required: true }),
        avatar: mongoose.Type.string({ required: true }),
    },
    content: mongoose.Type.string({ required: true }),
    timestamp: mongoose.Type.string({ required: true }),
});

const TicketSchema = mongoose.createSchema({
    _id: mongoose.Type.objectId({ required: true }),
    title: mongoose.Type.string({ required: true }),
    topic: mongoose.Type.string({ required: true }),
    description: mongoose.Type.string({ required: true }),
    closed: mongoose.Type.boolean({ required: true }),
    timestamp: mongoose.Type.string({ required: true }),
    comments: mongoose.Type.array().of(CommentSchema),
});

export default mongoose.typedModel('Ticket', TicketSchema);
