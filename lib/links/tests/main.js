//import {
//    PostCollection,
//    CategoryCollection,
//    CommentCollection,
//    ResolverCollection
//} from './collections.js';

let PostCollection = new Mongo.Collection('test_post');
let CategoryCollection = new Mongo.Collection('test_category');
let CommentCollection = new Mongo.Collection('test_comment');
let ResolverCollection = new Mongo.Collection('test_resolver');

PostCollection.attachSchema(new SimpleSchema({
    text: {type: String}
}));
CommentCollection.attachSchema(new SimpleSchema({
    text: {type: String}
}));
CategoryCollection.attachSchema(new SimpleSchema({
    text: {type: String}
}));
ResolverCollection.attachSchema(new SimpleSchema({
    resourceId: {type: String}
}));

PostCollection.addLinks({
    'comments': {
        type: '*',
        collection: CommentCollection,
        field: 'commentIds'
    },
    'metaComments': {
        type: '*',
        collection: CommentCollection,
        metadata: {
            approved: {type: Boolean, optional: true},
            date: {type: Date, optional: true},
            updated: {type: Date, optional: true}
        }
    },
    category: {
        collection: CategoryCollection,
        type: '1'
    },
    metaCategory: {
        metadata: {},
        collection: CategoryCollection,
        type: '1'
    },
    pictures: {
        resolve(object) {
            return ResolverCollection.find({
                resourceId: object._id
            }).fetch();
        }
    }

});

CommentCollection.addLinks({
    post: {
        collection: PostCollection,
        inversedBy: 'comments'
    },
    metaPost: {
        collection: PostCollection,
        inversedBy: 'metaComments'
    }
});

CategoryCollection.addLinks({
    'posts': {
        collection: PostCollection,
        inversedBy: 'category'
    }
});

PostCollection.remove({});
CategoryCollection.remove({});
CommentCollection.remove({});
ResolverCollection.remove({});

describe('Collection Links', function () {
    it('Test Many', function () {
        let postId = PostCollection.insert({'text': 'abc'});
        let commentId = CommentCollection.insert({'text': 'abc'});

        let post = PostCollection.findOne(postId);
        const link = PostCollection.getLink(post, 'comments');
        link.add(commentId);
        assert.lengthOf(link.find().fetch(), 1);

        link.remove(commentId);
        assert.lengthOf(link.find().fetch(), 0);
    });

    it('Tests One', function () {
        let postId = PostCollection.insert({'text': 'abc'});
        let categoryId = CategoryCollection.insert({'text': 'abc'});

        let post = PostCollection.findOne(postId);

        const link = PostCollection.getLink(post, 'category');
        link.set(categoryId);
        assert.lengthOf(link.find().fetch(), 1);

        link.unset();
        assert.lengthOf(link.find().fetch(), 0);
    });

    it('Tests One Meta', function () {
        let postId = PostCollection.insert({'text': 'abc'});
        let categoryId = CategoryCollection.insert({'text': 'abc'});

        let post = PostCollection.findOne(postId);

        let link = PostCollection.getLink(post, 'metaCategory');
        link.set(categoryId, {date: new Date()});

        assert.lengthOf(link.find().fetch(), 1);
        let metadata = link.metadata();

        assert.isObject(metadata);
        assert.instanceOf(metadata.date, Date);

        link.metadata({
            updated: new Date()
        });

        post = PostCollection.findOne(postId);
        link = PostCollection.getLink(post, 'metaCategory');
        assert.instanceOf(link.metadata().updated, Date);

        link.unset();
        assert.lengthOf(link.find().fetch(), 0);
    });

    it('Tests Many Meta', function () {
        let postId = PostCollection.insert({'text': 'abc'});
        let commentId = CommentCollection.insert({'text': 'abc'});

        let post = PostCollection.findOne(postId);
        let metaCommentsLink = PostCollection.getLink(post, 'metaComments');

        metaCommentsLink.add(commentId, {date: new Date});
        assert.lengthOf(metaCommentsLink.find().fetch(), 1);

        // verifying reverse search
        let metaComment = CommentCollection.findOne(commentId);
        let metaPostLink = CommentCollection.getLink(metaComment, 'metaPost');
        assert.lengthOf(metaPostLink.find().fetch(), 1);

        let metadata = metaCommentsLink.metadata(commentId);

        assert.isObject(metadata);
        assert.instanceOf(metadata.date, Date);

        metaCommentsLink.metadata(commentId, {updated: new Date});

        post = PostCollection.findOne(postId);
        metaCommentsLink = PostCollection.getLink(post, 'metaComments');

        metadata = metaCommentsLink.metadata(commentId);
        assert.instanceOf(metadata.updated, Date);

        metaCommentsLink.remove(commentId);
        assert.lengthOf(metaCommentsLink.find().fetch(), 0);
    });

    it('Tests inversedBy findings', function () {
        let postId = PostCollection.insert({'text': 'abc'});
        let commentId = CommentCollection.insert({'text': 'abc'});

        let post = PostCollection.findOne(postId);
        let comment = CommentCollection.findOne(commentId);
        let commentsLink = PostCollection.getLink(post, 'comments');
        let postLink = CommentCollection.getLink(comment, 'post');

        commentsLink.add(comment);
        assert.lengthOf(postLink.find().fetch(), 1);

        CommentCollection.remove(comment._id);
        post = PostCollection.findOne(postId);
        assert.notInclude(post.commentIds, comment._id);
    });

    it('Tests proper resolver', function () {
        let postId = PostCollection.insert({'text': 'abc'});
        let uploadId = ResolverCollection.insert({'resourceId': postId});

        let post = PostCollection.findOne(postId);
        const link = PostCollection.getLink(post, 'pictures');

        assert.lengthOf(link.fetch(), 1);
    });

    it('Tests schema appending properly', function () {

    });
});