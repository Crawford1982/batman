(() => {
  const key='gotham-analytics-choice-v1';
  let id='',consent=false,loaded=false,panel;
  const allowedHost=['batman1989.co.uk','www.batman1989.co.uk'].includes(location.hostname);
  // Local development and verification visits never enter production reports.
  if(!allowedHost || new URLSearchParams(location.search).has('test'))return;
  function readChoice(){try{const v=JSON.parse(localStorage.getItem(key));return v&&Date.now()-v.at<180*86400000?v.accept:null;}catch{return null;}}
  function remember(accept){try{localStorage.setItem(key,JSON.stringify({accept,at:Date.now()}));}catch{}}
  function clearCookies(){for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(!/^_ga($|_)/.test(name))continue;for(const domain of ['',location.hostname,'.'+location.hostname])document.cookie=`${name}=; Max-Age=0; path=/;${domain?' domain='+domain+';':''} SameSite=Lax; Secure`;}}
  function choose(accept,persist=true){
    consent=accept;if(persist)remember(accept);panel.hidden=true;
    window['ga-disable-'+id]=!accept;
    if(!accept){if(loaded)window.gtag('consent','update',{analytics_storage:'denied'});clearCookies();return;}
    if(loaded){window.gtag('consent','update',{analytics_storage:'granted'});return;}
    loaded=true;window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments);};
    window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('consent','update',{analytics_storage:'granted'});
    window.gtag('js',new Date());
    window.gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:15552000});
    const tag=document.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.append(tag);
  }
  window.gothamAnalytics={
    event(name,params={}){
      if(!consent||!loaded||!['level_start','level_end'].includes(name))return;
      const safe={level_name:params.level_name==='batmobile'?'batmobile':'batwing'};
      if(name==='level_end'){safe.success=!!params.success;safe.elapsed_seconds=Math.max(0,Math.round(Number(params.elapsed_seconds)||0));safe.score=Math.max(0,Math.round(Number(params.score)||0));}
      window.gtag('event',name,safe);
    },
    openSettings(){if(panel){panel.hidden=false;panel.querySelector('button').focus();}}
  };
  async function init(){
    try{const config=await(await fetch('/analytics-config.json',{cache:'no-store'})).json();id=config.measurementId||'';}catch{return;}
    if(!/^G-[A-Z0-9]+$/.test(id))return;
    const style=document.createElement('style');style.textContent=`#analytics-consent{position:fixed;z-index:1000;left:16px;right:16px;bottom:16px;max-width:560px;margin:auto;background:#101e2e;color:#e2e8ed;border:1px solid #ad925e;padding:18px;font:14px/1.5 system-ui;box-shadow:0 5px 30px #0009}#analytics-consent[hidden]{display:none}#analytics-consent p{margin:0 0 12px}#analytics-consent a{color:#ebca89}#analytics-consent button{font:600 13px system-ui;letter-spacing:0;min-height:44px;background:#192c3e;color:#f1dfb9;border:1px solid #c6a66a;padding:10px 16px;margin:0 8px 0 0;cursor:pointer}#analytics-consent strong{display:block;margin-bottom:6px}`;document.head.append(style);
    panel=document.createElement('section');panel.id='analytics-consent';panel.setAttribute('aria-label','Analytics preferences');panel.innerHTML='<strong>Help improve Gotham?</strong><p>Optional Google Analytics cookies measure visits and which chapters people play. The game works either way. <a href="/privacy.html">Privacy &amp; cookies</a></p><button type="button" data-choice="no">No thanks</button><button type="button" data-choice="yes">Allow analytics</button>';
    panel.querySelector('[data-choice=no]').onclick=()=>choose(false);panel.querySelector('[data-choice=yes]').onclick=()=>choose(true);document.body.append(panel);
    const choice=readChoice();if(choice!==null)choose(choice,false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
