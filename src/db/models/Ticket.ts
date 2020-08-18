import mongoose from 'ts-mongoose';

// const AuthorSchema = mongoose.createSchema({
//     username: mongoose.Type.string({ required: true }),
//     discriminator: mongoose.Type.string({ required: true }),
//     avatar: mongoose.Type.string({ required: true }),
// });

export const CommentSchema = mongoose.createSchema({
    author: mongoose.Type.string({ required: true }),
    content: mongoose.Type.string({ required: true }),
    timestamp: mongoose.Type.string({ required: true }),
});

export const TicketSchema = mongoose.createSchema({
    _id: mongoose.Type.objectId({ required: true }),
    title: mongoose.Type.string({ required: true }),
    topic: mongoose.Type.string({ required: true }),
    description: mongoose.Type.string({ required: true }),
    author: mongoose.Type.string({ required: true }), // fetch user object (client side?) using https://discord.com/developers/docs/resources/user#get-user
    timestamp: mongoose.Type.string({ required: true }),
    closed: mongoose.Type.boolean({ required: true }),
    comments: mongoose.Type.array().of(CommentSchema),
});

export default mongoose.typedModel('Ticket', TicketSchema);
