
// Post type
class PostType {
    static get NORMAL() {
        return 0;
    }
    static get PLAN() {
        return 1;
    }
    static get EVENT() {
        return 2;
    }
}

// Post source
class PostSource {
    static get POST() {
        return 0;
    }
    static get SOUL() {
        return 1;
    }
}

try{
    window.PostSource = PostSource;
    window.PostType = PostType;
}catch{}

export {PostSource, PostType}
