async function testUrl(targetUrl, label) {
  console.log(`\n==============================================`);
  console.log(`🔍 [${label}] KakaoTalk Scraper Check: ${targetUrl}`);
  console.log(`==============================================`);

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1;kakaotalk-scrap/1.0; +https://devtalk.kakao.com/category/scrap'
      }
    });

    console.log('HTTP Status :', res.status);
    const html = await res.text();

    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
                    html.match(/<meta name="twitter:title" content="([^"]+)"/)?.[1];
    const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] ||
                   html.match(/<meta name="twitter:description" content="([^"]+)"/)?.[1];
    const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ||
                  html.match(/<meta name="twitter:image" content="([^"]+)"/)?.[1];
    const ogSite = html.match(/<meta property="og:site_name" content="([^"]+)"/)?.[1];
    const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];

    console.log('Site Name   :', ogSite || '(none)');
    console.log('OG Title    :', ogTitle || '(none)');
    console.log('OG Desc     :', ogDesc || '(none)');
    console.log('OG Image URL:', ogImg || '(none)');
    console.log('OG Page URL :', ogUrl || '(none)');

    if (ogImg) {
      const imgRes = await fetch(ogImg);
      const buffer = await imgRes.arrayBuffer();
      console.log('Image Status:', imgRes.status, `(${(buffer.byteLength / 1024).toFixed(1)} KB, ${imgRes.headers.get('content-type')})`);
      if (imgRes.status === 200 && buffer.byteLength > 1000) {
        console.log('✅ Image is accessible for KakaoTalk preview!');
      } else {
        console.log('❌ Image check failed');
      }
    }
  } catch (err) {
    console.error('Check failed:', err);
  }
}

async function main() {
  await testUrl('https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet/use-cases', 'Use Cases Page');
  await testUrl('https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet/', 'Home Page');
}

main();
