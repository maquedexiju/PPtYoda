## placeholder 相关

### placeholder 在 ppt 中的形态

```shell
@type-name(style):description
```

### placeholer 在 json 中的形态

```json
[
    {
        "name": "名称",
        "type": "container", // 包括 text img svg container
        "description": "描述",
        "min_component_number": 1, // 针对 container，即其下重复元素的最小数量
        "max_component_number": 3, // 针对 container，即其下重复元素的最大数量
        "component_placeholders": [
            // 针对 container，即其下重复元素中的 placeholder
            // 格式和 placeholder 一致
        ],
        "style": "参考下方说明" // 针对 container
    }
]
```

### style 格式

1. 最小数量 min_n：数字
2. 最大数量 max_n：数字
3. 展开方向 direction：lr 或 tb
4. 水平对齐方式 align：l 或 c 或 r 或 j 
5. 垂直对齐方式 valign：t 或 c 或 b 或 j
6. 延伸方向的间隔 gap：数字

## component 格式

### component 在 ppt 中的形态

```shell
#名称
```

### component 在 json 中的形态

```json
{
    "name": "名称",
    "xml": "xml 内容",
    "placeholers": [
        // 同上方的 placeholder
    ],
}
```

## 解析好的 ppt slide_templates

```json
[
    {
        "id": 0,
        "name": "封面",
        "description": "",
        "placeholders": [
            {"name": "标题", "type": "text"},
            {"name": "副标题", "type": "text"},
            {"name": "更多信息", "type": "text"},
            {"name": "日期", "type": "text"}
        ]
    }
]
```

## slide_data 的 json

```json
{
    "template_id": 模板id,
    "placeholders": [
        {
            "name": "名称",
            "type": "container", // 包括 text img svg container
            "content": "内容", // 针对 text img svg
            "components_placeholders": [ // 针对 container
                [
                    // 单个 component 的所有 placeholders
                ],
                [
                    // 第二个 component 的所有 placeholders
                ]
            ]
        }
    ]
}
```

也可以是 section 或者 template

```json
{
    "section_name": "section 名称",
}

{
    "template_name": "template 名称",
}
```

## quoted_info

### sections 格式

```json
{
    "section_name": [
        {
            "id": 页面 id
            "name": 页面 name
        }
    ]
}
```

### quoted_info 保存格式

```json
[
    页面 id
]
```
