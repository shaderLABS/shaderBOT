import mongoose from 'ts-mongoose';

// const AuthorSchema = mongoose.createSchema({
//     username: mongoose.Type.string({ required: true }),
//     discriminator: mongoose.Type.string({ required: true }),
//     avatar: mongoose.Type.string({ required: true }),
// });

export const CommentSchema = mongoose.createSchema({
    _id: mongoose.Type.objectId({ required: true }),
    message: mongoose.Type.string({ required: true }),
    author: mongoose.Type.string({ required: true }),
    content: mongoose.Type.string({ required: true }),
    timestamp: mongoose.Type.string({ required: true }),
    edited: mongoose.Type.boolean({ required: false, default: false }),
});

export const TicketSchema = mongoose.createSchema({
    _id: mongoose.Type.objectId({ required: true }),
    title: mongoose.Type.string({ required: true }),
    project: mongoose.Type.string({ required: true }),
    description: mongoose.Type.string({ required: true }),
    author: mongoose.Type.string({ required: true }), // fetch user object (client side?) using https://discord.com/developers/docs/resources/user#get-user
    timestamp: mongoose.Type.string({ required: true }),
    closed: mongoose.Type.boolean({ required: true }),
    channel: mongoose.Type.string({ required: false }),
    comments: mongoose.Type.array().of(CommentSchema),
});

export default mongoose.typedModel('Ticket', TicketSchema);
// export const Comment = mongoose.typedModel('Comment', CommentSchema);
