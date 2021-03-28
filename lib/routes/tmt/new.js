const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    // const area = ctx.params.area;
    const url = 'https://www.tmtpost.com/new';
    const response = await got({
        method: 'get',
        url: url,
    });
    const $ = cheerio.load(response.data);
    const list = $('ul[class=hot_list]').children().map(
        (_,item)=>{
            item = $(item)
            if(item.find("a").attr("href").indexOf("/video/")==-1){
                return {
                    link: `https://www.tmtpost.com${item.find("a").attr("href")}`,
                    title: item.find("h3[class=tits]").text(),
                    pubDate:"",
                    description:"",
                }
            }
        }
    ).get();
    console.log(list)
    let items = await Promise.all(
        list.map(
            async (item) =>
                await ctx.cache.tryGet(item.link, async () => {
                    const detailResponse = await got({
                        method: 'get',
                        url: item.link,
                    });
                    const content = cheerio.load(detailResponse.data);
                    item.description = content('article[class=inner]').html();
                    item.pubDate = content('meta[property="article:published_time"]').attr("content");
                    console.log(item.pubDate)
                    return item;
                })
        )
    );
    items = items.sort();
    ctx.state.data = {
        title: $('title').text(),
        link: 'https://www.tmtpost.com/new',
        description: $('meta[name="description"]').attr('content') || $('title').text(),
        item: items,
    };
};
