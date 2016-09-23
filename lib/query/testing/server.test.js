import { createQuery } from 'meteor/cultofcoders:grapher';
import Comments from './bootstrap/comments/collection.js';

describe('Hypernova', function () {
    it('Should fetch One links correctly', function () {
        const data = createQuery({
            comments: {
                text: 1,
                author: {
                    name: 1
                }
            }
        }).fetch();

        assert.lengthOf(data, Comments.find().count());
        assert.isTrue(data.length > 0);

        _.each(data, comment => {
            assert.isObject(comment.author);
            assert.isString(comment.author.name);
            assert.isString(comment.author._id);
            assert.isTrue(_.keys(comment.author).length == 2);
        })
    });

    it('Should fetch One links with limit and options', function () {
        const data = createQuery({
            comments: {
                $options: {limit: 5},
                text: 1
            }
        }).fetch();

        assert.lengthOf(data, 5);
    });

    it('Should fetch One-Inversed links with limit and options', function () {
        const data = createQuery({
            authors: {
                $options: {limit: 5},
                comments: {
                    $filters: {text: 'Good'},
                    $options: {limit: 2},
                    text: 1
                }
            }
        }).fetch();

        assert.lengthOf(data, 5);
        _.each(data, author => {
            assert.lengthOf(author.comments, 2);
            _.each(author.comments, comment => {
                assert.equal('Good', comment.text);
            })
        })
    });

    it('Should fetch Many links correctly', function () {
        const data = createQuery({
            posts: {
                $options: {limit: 5},
                title: 1,
                tags: {
                    text: 1
                }
            }
        }).fetch();

        assert.lengthOf(data, 5);
        _.each(data, post => {
            assert.isString(post.title);
            assert.isArray(post.tags);
            assert.isTrue(post.tags.length > 0);
        })
    });

    it('Should fetch Many - inversed links correctly', function () {
        const data = createQuery({
            tags: {
                name: 1,
                posts: {
                    $options: {limit: 5},
                    title: 1
                }
            }
        }).fetch();

        _.each(data, tag => {
            assert.isString(tag.name);
            assert.isArray(tag.posts);
            assert.lengthOf(tag.posts, 5);
            _.each(tag.posts, post => {
                assert.isString(post.title);
            })
        })
    });

    it('Should fetch One-Meta links correctly', function () {
        const data = createQuery({
            posts: {
                $options: {limit: 5},
                title: 1,
                group: {
                    name: 1
                }
            }
        }).fetch();

        assert.lengthOf(data, 5);
        _.each(data, post => {
            assert.isString(post.title);
            assert.isString(post._id);
            assert.isObject(post.group);
            assert.isString(post.group._id);
            assert.isString(post.group.name);
        })
    });

    it('Should fetch One-Meta inversed links correctly', function () {
        const data = createQuery({
            groups: {
                name: 1,
                posts: {
                    title: 1
                }
            }
        }).fetch();

        _.each(data, group => {
            assert.isString(group.name);
            assert.isString(group._id);
            assert.lengthOf(_.keys(group), 3);
            assert.isArray(group.posts);
            _.each(group.posts, post => {
                assert.isString(post.title);
                assert.isString(post._id);
            })
        })
    });

    it('Should fetch Many-Meta links correctly', function () {
        const data = createQuery({
            authors: {
                name: 1,
                groups: {
                    $options: {limit: 1},
                    name: 1
                }
            }
        }).fetch();

        _.each(data, author => {
            assert.isArray(author.groups);
            assert.lengthOf(author.groups, 1);

            _.each(author.groups, group => {
                assert.isObject(group);
                assert.isString(group._id);
                assert.isString(group.name);
            })
        })
    });

    it('Should fetch Many-Meta inversed links correctly', function () {
        const data = createQuery({
            groups: {
                name: 1,
                authors: {
                    $options: {limit: 2},
                    name: 1
                }
            }
        }).fetch();

        _.each(data, group => {
            assert.isArray(group.authors);
            assert.isTrue(group.authors.length <= 2);

            _.each(group.authors, author => {
                assert.isObject(author);
                assert.isString(author._id);
                assert.isString(author.name);
            })
        })
    });

    it('Should fetch Resolver links properly', function () {
        const data = createQuery({
            posts: {
                $options: {limit: 5},
                commentsCount: 1
            }
        }).fetch();

        assert.lengthOf(data, 5);
        _.each(data, post => {
            assert.equal(10, post.commentsCount);
        })
    })

    it('Should fetch in depth properly at any given level.', function () {
        const data = createQuery({
            authors: {
                $options: {limit: 5},
                posts: {
                    $options: {limit: 5},
                    comments: {
                        $options: {limit: 5},
                        author: {
                            groups: {
                                posts: {
                                    $options: {limit: 5},
                                    author: {
                                        name: 1
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }).fetch();

        assert.lengthOf(data, 5);
        let arrivedInDepth = false;

        _.each(data, author => {
            _.each(author.posts, post => {
                _.each(post.comments, comment => {
                    _.each(comment.author.groups, group => {
                        _.each(group.posts, post => {
                            assert.isString(post.author.name);
                            arrivedInDepth = true;
                        })
                    })
                })
            })
        });

        assert.isTrue(arrivedInDepth);
    })
});