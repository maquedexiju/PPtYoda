const apiKey = "{API_KEY}";
const url = "{URL}/api/slide/{TASK_ID}/save_full_text/";

// 定义一个函数
function doubaoHelper() {

    // 打印 "doubaoHelper"
    console.log("doubaoHelper");
    // 获取 data-testid="message_text_content" 的所有 div 的父元素
    var messageTextContentDivs = document.querySelectorAll('div[data-testid="message_text_content"]');
    console.log('doubaoHelper 获取到相关元素', messageTextContentDivs.length);
    // 遍历每个 div 的父元素
    for (var i = 0; i < messageTextContentDivs.length; i++) {
        var messageTextContentDiv = messageTextContentDivs[i];
        // 获取 div 的父元素
        var parentDiv = messageTextContentDiv.parentElement;
        // 获取父元素下的第一个元素
        var firstElement = parentDiv.firstElementChild;
        if (firstElement.className != "doubao-helper-button") {
            add_button(parentDiv);
        }
    }
}

function add_button(ele) {
    var button = document.createElement("button");
    button.className = "doubao-helper-button";
    button.innerHTML = "下载";
    button.addEventListener("click", download_message);
    // ele 下的第一个元素设置为 button
    ele.insertBefore(button, ele.firstElementChild);
}

// 定义一个 click 事件 handler
function download_message(event) {

    // 获取 event 的 target 的父元素
    var parentDiv = event.target.parentElement;
    // 获取 parentDiv 下 data-testid="message_text_content" 的元素
    var messageTextContentDiv = parentDiv.querySelector('div[data-testid="message_text_content"]');
    // 获取 messageTextContentDiv 下的 innerHTML
    var messageTextContent = messageTextContentDiv.innerHTML;
    var messageMd = html_to_md(messageTextContent);
    
    // 将 fileName messageMd 上传到 url
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        redirect: 'follow',
        body: JSON.stringify({
            'full_text': messageMd,
            'api_key': apiKey,
        })
    }).then(response => {
        console.log('上传成功', response);
    }).catch(error => {
        console.error('上传失败', error);
    });
}

function html_to_md(html) {
      // 辅助函数：处理嵌套标签
  const removeNestedTags = (text, tag, replacement) => {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'gis');
    return text.replace(regex, (_, content) => {
      return replacement + removeNestedTags(content, tag, replacement) + replacement;
    });
  };

  // 替换步骤
  return html
    // 处理代码块
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => 
        `\n\`\`\`\n${code.replace(/<\/?[^>]+(>|$)/g, '').trim()}\n\`\`\`\n`)
    // 处理行内代码
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    // 处理标题
    .replace(/<h([1-6])\b[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => 
        `${'#'.repeat(level)} ${text.trim()}\n\n`)
    // 处理段落
    .replace(/<p\b[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // 处理换行
    .replace(/<br\s*\/?>/gi, '\n')
    // 处理水平线
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    // 处理引用
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => 
        text.split('\n').map(line => `> ${line.trim()}`).join('\n') + '\n\n')
    // 处理无序列表
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => 
        items.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (match, item) => 
        `- ${item.trim()}\n`).replace(/\n\n/g, '\n') + '\n')
    // 处理有序列表（修复编号问题）
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
        let index = 0;
        const listContent = items.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (match, item) => 
            `${++index}. ${item.trim()}\n`);
        return listContent.replace(/\n\n/g, '\n') + '\n';
    })
    // 处理表格
    .replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
        const rows = tableContent.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
        if (!rows || rows.length === 0) return '';
        
        let markdownTable = '';
        let headers = [];
        let isHeaderRow = true;
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.match(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi);
            if (!cells) continue;
            
            const rowData = cells.map(cell => {
                return cell.replace(/<(?:th|td)\b[^>]*>|<\/(?:th|td)>/gi, '')
                    .replace(/<\/?[^>]+(>|$)/g, '')
                    .trim();
            });
            
            // 添加表头分隔行
            if (isHeaderRow) {
                markdownTable += '| ' + rowData.join(' | ') + ' |\n';
                markdownTable += '|' + rowData.map(() => '---').join('|') + '|\n';
                isHeaderRow = false;
            } else {
                markdownTable += '| ' + rowData.join(' | ') + ' |\n';
            }
        }
        
        return '\n' + markdownTable + '\n';
    })
    // 处理图片
    .replace(/<img\b[^>]*alt="(.*?)"[^>]*src="(.*?)"[^>]*>/gi, '![$1]($2)')
    // 处理链接
    .replace(/<a\b[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // 移除剩余HTML标签
    .replace(/<\/?[^>]+(>|$)/g, '')
    // 压缩多余空行
    .replace(/^\s*[\r\n]/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    // 替换 &amp; &lt; &gt; &quot; &apos;
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
    // .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => 
    //     `\n\`\`\`\n${code.replace(/<\/?[^>]+(>|$)/g, '').trim()}\n\`\`\`\n`)
    // .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    // .replace(/<h([1-6])\b[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => 
    //     `${'#'.repeat(level)} ${text.trim()}\n\n`)
    // .replace(/<p\b[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // .replace(/<br\s*\/?>/gi, '\n')
    // .replace(/<hr\s*\/?>/gi, '\n---\n')
    // .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => 
    //     text.split('\n').map(line => `> ${line.trim()}`).join('\n') + '\n\n')
    // // 修复列表项间的多余换行
    // .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => 
    //     items.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (match, item) => 
    //     `- ${item.trim()}\n`).replace(/\n\n/g, '\n') + '\n')
    // .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
    //     let index = 0;
    //     const listContent = items.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (match, item) => 
    //         `${++index}. ${item.trim()}\n`);
    //     return listContent.replace(/\n\n/g, '\n') + '\n';
    // })
    // .replace(/<img\b[^>]*alt="(.*?)"[^>]*src="(.*?)"[^>]*>/gi, '![$1]($2)')
    // .replace(/<a\b[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // .replace(/<\/?[^>]+(>|$)/g, '')  // 移除剩余HTML标签
    // .replace(/^(\s*[\r\n]){2,}/gm, '\n\n')  // 压缩多余空行
    // .trim();

}


function getSelectedHtml(selection) {
    
    if (selection.rangeCount === 0) {
      return ''; // 没有选中内容
    }
    
    const range = selection.getRangeAt(0);
    const documentFragment = range.cloneContents();
    
    // 创建临时容器
    const container = document.createElement('div');
    container.appendChild(documentFragment);
    
    return container.innerHTML;
}

// 循环执行 doubaoHelper 函数
setInterval(doubaoHelper, 5000);


//添加事件处理器，当有文字被选中时
document.addEventListener("mouseup", function(event) {

    // 如果 event.target 不是 copy-select-button，删除 copy-select-button
    if (
        event.target.className != "download-select-button" 
        && event.target.className!= "copy-select-button" 
        && event.target.className!= "delete-select-button"
    ) {
        var downloadSelectButton = document.querySelector(".download-select-button");
        if (downloadSelectButton) {
            downloadSelectButton.remove();
        }

        var copySelectButton = document.querySelector(".copy-select-button");
        if (copySelectButton) {
            copySelectButton.remove();
        }

        var deleteSelectButton = document.querySelector(".delete-select-button");
        if (deleteSelectButton) {
            deleteSelectButton.remove();
        }

    }


    const selection = window.getSelection();
    // 获取选中的文字
    var selectedHtml = getSelectedHtml(selection);
    var selectedMd = html_to_md(selectedHtml);

    // 添加 download-select-button
    if (selectedHtml) {
        // 创建一个下载 button
        var button = document.createElement("button");
        button.className = "download-select-button";
        button.innerHTML = "获取选中内容";
        button.addEventListener("click", function() {
            //弹框询问文件名
            var fileName = prompt("请输入文件名", "文件名尽量能概括文章主要内容");
            
            // 保存 selectedMd 到 fileName
            // var blob = new Blob([selectedMd], { type: "text/plain" });
            // var url = URL.createObjectURL(blob);

            // var a = document.createElement("a");
            // a.href = url;
            // a.download = fileName;
            // a.click();
            // URL.revokeObjectURL(url);
            // 将 fileName messageMd 上传到 url
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                redirect: 'follow',
                body: JSON.stringify({
                    'name': fileName,
                    'content': selectedMd,
                    'api_key': apiKey,
                })
            }).then(response => {
                console.log('上传成功', response);
            }).catch(error => {
                console.error('上传失败', error);
            });
        })
        // button 添加到 selection 的左下方
        selection.getRangeAt(0).getBoundingClientRect();
        button.style.left = selection.getRangeAt(0).getBoundingClientRect().left + "px";
        button.style.top = selection.getRangeAt(0).getBoundingClientRect().bottom + "px";
        button.style.position = "absolute";
        // 添加到 body
        document.body.appendChild(button);


        // 再添加一个复制按钮
        var copyButton = document.createElement("button");
        copyButton.className = "copy-select-button";
        copyButton.innerHTML = "复制选中内容";
        copyButton.addEventListener("click", function() {
            // 复制 selectedMd
            navigator.clipboard.writeText(selectedMd);
        })
        // copyButton 添加到 button 右边
        copyButton.style.left = button.offsetLeft + button.offsetWidth + "px";
        copyButton.style.top = button.offsetTop + "px";
        copyButton.style.position = "absolute";
        // 添加到 body
        document.body.appendChild(copyButton);

        // 添加一个删除按钮
        var deleteButton = document.createElement("button");
        deleteButton.className = "delete-select-button";
        deleteButton.innerHTML = "删除选中内容";
        deleteButton.addEventListener("click", function() {
            // 删除 selectedHtml
            selection.deleteFromDocument();
        })
        // deleteButton 添加到 copyButton 右边
        deleteButton.style.left = copyButton.offsetLeft + copyButton.offsetWidth + "px";
        deleteButton.style.top = copyButton.offsetTop + "px";
        deleteButton.style.position = "absolute";

        document.body.appendChild(deleteButton);
    }
})