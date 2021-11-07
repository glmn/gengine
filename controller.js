class ActionController {
    constructor(parsed_url){
        this.url = parsed_url
    }

    findAction(){
        switch(this.url.host){
            case 'vk.com':
                return this.vk()
            case 'ok.ru':
                return this.ok()
            default: return ''
        }
    }

    vk(){
        return `alert('vk')`
    }

    ok(){
        return `alert('ok')`
    }
}

module.exports = ActionController