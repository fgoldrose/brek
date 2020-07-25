chrome.runtime.onInstalled.addListener(function(){
    chrome.storage.sync.set({groups: [{urls: ['reddit.com'], onTime: 500000, offTime: 2000}
                                , {urls:['twitter.com'], onTime: 300000, offTime: 30000}]}, function(){
        console.log("Set initial (test) group");
    });
});


let groups;

let curGroup;
let timeout;
let endTime;

chrome.storage.sync.get('groups', function(items){
    groups = items.groups;
})

function stripUrl(url){
    return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
}

function getGroup(url){
    for(let g = 0; g < groups.length; g++){       
        for (let u = 0; u < groups[g].urls.length; u++){
            if(url.startsWith(groups[g].urls[u])){
                return groups[g];
            }
        }
    }
    return null;
}


function blockPage(tabId){
    console.log('blocked');
    chrome.tabs.remove(tabId); // closes the blocked tab
}

function onNewPage(url, tabId){
    url = stripUrl(url);
    console.log(url);
    
    // pause old timer
    if(curGroup){
        clearTimeout(timeout);
        //clearTimeout(waitTimeout);
        curGroup.timeLeft = endTime - Date.now();
    }
    // get new group number
    let group = getGroup(url);
    curGroup = group;
    console.log(curGroup);

    if(group){

        if(group.blocked){
            blockPage(tabId);
            return;
        }

        // new timeout for group
        let waitTime = group.timeLeft || group.onTime;
        endTime = Date.now() + (waitTime);
        timeout = setTimeout(function(){timeUp(group, tabId);}, waitTime);
    }
}


function timeUp(finished, tabId){
    console.log('time ended');
    finished.blocked = true;
    blockPage(tabId);
    setTimeout(function(){
        console.log('wait ended')
        finished.blocked = false;
        finished.timeLeft = finished.onTime;
        if(curGroup == finished){
            endTime = Date.now() + finished.onTime;
            timeout = setTimeout(function(){timeUp(finished, tabId);}, finished.onTime);
        }
    }, finished.offTime);
}


chrome.tabs.onActivated.addListener(function(t){
    chrome.tabs.get(t.tabId, function(tab){
    onNewPage(tab.url, t.tabId);
    })
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    if(tab.active && changeInfo.url) {
        onNewPage(changeInfo.url, tabId);
    }
});


