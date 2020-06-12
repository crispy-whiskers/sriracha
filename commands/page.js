var Row = require('../row');
var axios = require('axios').default;
var info = require('../config/globalinfo.json')

/**
 * 
 * @param {String} url 
 * @returns {Number} the length of the gallery. returns -1 if failed.
 */
async function fetch(url){
    
    return new Promise( (resolve, reject)=>{
        if (url.indexOf("nhentai") == -1 && url.indexOf("imgur") == -1) reject(-1); //not mainstream site. cannot fetch.
        resolve();
    }).then(()=>{
        if (url.indexOf("nhentai") > -1) {
            //ensure good url
            if (!url.match(/^https:\/\/nhentai.net\/g\/\d+/)) reject(-1);
            if (!url.match(/https:\/\/nhentai.net\/g\/\d+\//g)) url += "/";

            return axios.get(url).then((resp)=>{
                code = +resp.data?.match(/\<span class="name"\>(\d+)</)[1] ?? -1;
                //code = +resp.data?.match(/(\d+) pages/)[1] ?? -1; old nh ui
                if(code==-1)
                    throw code;
                else return code;
            })

        } else {
            let hashCode = /https:\/\/imgur.com\/a\/([A-z0-9]*)/.exec(url)[1];
            return axios.get(`https://api.imgur.com/3/album/${hashCode}`, {
                headers: {'Authorization': info.imgurClient}
            }).then((resp)=>{
                code = resp.data?.data?.images_count ?? -1;
                if(code==-1)
                    throw code;
                else return code;    
            }).catch((e)=>{
                console.log(e)
            })
        }
    })
}
module.exports = fetch;