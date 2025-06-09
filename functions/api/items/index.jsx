import { ITEM_STATUSES_STRINGS_DICT, STATUSES } from '../../../common-src/Constants';
import {datetimeLocalToMs} from "../../../common-src/TimeUtils";
import {htmlToPlainText} from "../../../common-src/StringUtils";

async function tryGenerateKeyWords(htmlContent, env) {
  try {
    const textContent = htmlToPlainText(htmlContent);
    const req = {
      messages: [{
        role: "system",
        content: "You are a SEO master, generate CHINESE keywords meta tag value ONLY with given CHINESE html content. DO NOT give any other output, ONLY give keywords meta tag value, e.g.: ai,人工智能,gpt,sci-fi"
      },{
        role: "user",
        "content": textContent
      }]
    }
    const result = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Autorization": "Bearer " + env.CLOUDFLARE_WORKER_AI_TOKEN
      },
      body: JSON.stringify(req)
    })
    const resp = await resp.json();
    if (resp && resp.success) {
      return resp.result.response;
    }
    return null;
  } catch (error) {
    return null;
  }
  
}

// TODO: defensive code to handle some common errors
export async function onRequestPost({ request, data, env }) {
  const {
    id, // eslint-disable-line no-unused-vars
    ...itemJson
  } = await request.json();
  itemJson.status = ITEM_STATUSES_STRINGS_DICT[itemJson.status] || STATUSES.PUBLISHED;
  itemJson.date_published_ms = itemJson.date_published_ms ? itemJson.date_published_ms : datetimeLocalToMs(new Date());

  const keywords = await tryGenerateKeyWords(itemJson.description, env);
  if (keywords) {
    itemJson.seo.keywords = keywords
  }
  
  const { feedCrud } = data;
  const itemId = await feedCrud.upsertItem(itemJson);

  return new Response(JSON.stringify({
    id: itemId,
  }), {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
    status: 201,
  });
}
