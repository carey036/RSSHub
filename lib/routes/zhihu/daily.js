const got = require('@/utils/got');
const utils = require('./utils');

// 参考：https://github.com/izzyleung/ZhihuDailyPurify/wiki/%E7%9F%A5%E4%B9%8E%E6%97%A5%E6%8A%A5-API-%E5%88%86%E6%9E%90
// 文章给出了v4版 api的信息，包含全文api

module.exports = async (ctx) => {
    const listRes = await got({
        method: 'get',
        url: 'https://news-at.zhihu.com/api/4/news/latest',
        headers: {
            ...utils.header,
            Referer: 'https://news-at.zhihu.com/api/4/news/latest',
        },
    });
    // 根据api的说明，过滤掉极个别站外链接
    const storyList = listRes.data.stories.filter((el) => el.type === 0);
    // console.log(date)
    const resultItem = await Promise.all(
        storyList.map(async (story) => {
            const url = 'https://news-at.zhihu.com/api/4/news/' + story.id;
            const item = {
                title: story.title,
                description: '',
                link: 'https://daily.zhihu.com/story/' + story.id,
                pubDate: new Date(listRes.data.date.slice(0,4) + "-" + listRes.data.date.slice(4,6) + "-" + listRes.data.date.slice(6,8)).toUTCString(),
            };
            const key = 'daily' + story.id;
            const value = await ctx.cache.get(key);

            if (value) {
                item.description = value;
            } else {
                const storyDetail = await got({
                    method: 'get',
                    url: url,
                    headers: {
                        Referer: url,
                    },
                });
                item.description = utils.ProcessImage(storyDetail.data.body.replace(/<div class="meta">([\s\S]*?)<\/div>/g, '<strong>$1</strong>').replace(/<\/?h2.*?>/g, ''));
                ctx.cache.set(key, item.description);
            }

            return Promise.resolve(item);
        })
    );

    ctx.state.data = {
        title: '知乎日报',
        link: 'https://daily.zhihu.com',
        description: '每天3次，每次7分钟',
        item: resultItem,
    };
};
