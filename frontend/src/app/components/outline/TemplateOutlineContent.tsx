import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import { OutlineTask } from './TaskItem';
import { LoadingModal } from '../general/Loading';
import { PageItem, SectionData } from '../pptTemplate/PPtTemplate';

interface QuoteInfoResponse {
  quoted_info: string[];
}

interface TemplateOutlineContentProps {
  sections: SectionData[];
  outline: OutlineTask;
}

export const TemplateOutlineContent: React.FC<TemplateOutlineContentProps> = ({ 
  sections, outline
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [flattenedPages, setFlattenedPages] = useState<Record<string, PageItem>>({});

  // 获取章节和页面数据
  const fetchQuotedInfo = async (flattenedPages: Record<string, PageItem>) => {
    const csrftoken = getCookie('csrftoken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${outline.id}/get_quoted_info/`;
    const response = await axios.post<QuoteInfoResponse>(apiUrl, {}, {
      headers: {
        'X-CSRFToken': csrftoken,
      },
      withCredentials: true
    });
    // 遍历 response.data 中的章节和页面，把 sections 中的页面选中状态设置为 true
    const quotedInfo = response.data.quoted_info;
    const newSelected = [];
    quotedInfo.forEach(pageId => {
      newSelected.push(flattenedPages[pageId]);
    });
    setSelectedPages(newSelected);

    // Object.keys(quotedInfo).map(section => {

    //   quotedInfo[section].forEach(page => {
    //     setSelectedPages(prev => ({
    //       ...prev,
    //       [page]: true
    //     }));
    //   });
    // });
  }

  // useEffect(() => {

  //   setIsLoading(true);
  //   fetchQuotedInfo();
  //   setIsLoading(false);
  // }, [outline]);

  useEffect(() => {
    if (!sections) {
      return;
    }
    // 把 sections 中的页面展开
    const flattened: Record<number, PageItem> = {};
    Object.keys(sections).forEach(section => {
      sections[section].forEach(page => {
        flattened[page.id] = page;
      });
    });
    setFlattenedPages(flattened);
    setIsLoading(true);
    fetchQuotedInfo(flattened);
    setIsLoading(false);

  }, [sections, outline]);



  // 切换章节展开/折叠
  const toggleSection = (e: React.MouseEvent<HTMLDivElement>, sectionName: string) => {
    if (e.target.tagName === 'INPUT' && expandedSection === sectionName) {
      return;
    }
    setExpandedSection(expandedSection === sectionName ? null : sectionName);
  };

  // 切换页面选中状态
  const togglePage = (e: React.MouseEvent<HTMLInputElement> | null, pageId: number) => {
    // 点击到 label 的时候会触发 label 和 input 各一次，所以屏蔽 label 的事件
    if (e && e.target.tagName === 'LABEL') {
      return;
    }
    // 删除或者添加
    if (selectedPages.filter(page => page.id === pageId).length > 0) {
      // 删除
      setSelectedPages(selectedPages.filter(page => page.id !== pageId));
    } else {
      // 添加
      setSelectedPages([...selectedPages, flattenedPages[pageId]]);
    }
  };

  // 切换章节下所有页面选中状态
  const toggleSectionAll = (sectionName: string) => {
    const sectionPages = sections[sectionName] || [];
    const allSelected = sectionPages.every(page => selectedPages.filter(p => p.id === page.id).length > 0);
    
    const newSelected = selectedPages.filter(page => sectionPages.filter(p => p.id === page.id).length === 0);
    if (allSelected) {
      // 全部选中，取消全部选中
      setSelectedPages(newSelected);
    } else {
      // 全部取消选中，选中全部
      setSelectedPages([...newSelected, ...sectionPages]);
    }
  };

  // 检查章节是否全选
  const isSectionAllSelected = (sectionName: string): boolean => {
    const sectionPages = sections[sectionName] || [];
    if (sectionPages.length === 0) {
      return false;
    }
    return sectionPages.every(page => selectedPages.filter(p => p.id === page.id).length > 0);
  };

  // 检查章节选中了多少
  const isSectionSelectedCount = (sectionName: string): number => {
    const sectionPages = sections[sectionName] || [];
    const selectedCount = sectionPages.filter(page => selectedPages.filter(p => p.id === page.id).length > 0).length;
    return selectedCount;
  };

  // 保存选中状态
  const handleSave = async () => {
    try {
      setSaveLoading(true);
      const csrfToken = getCookie('csrftoken');
      // 需要返回格式如： {section: [page_id1, page_id2, ...]}
      // const quotedInfo = {};
      // Object.keys(sections).map(section => {
      //   const pages = sections[section].filter(page => selectedPages[page.id]).map(page => page.id);
      //   if (pages.length > 0) {
      //     quotedInfo[section] = pages;
      //   }
      // });
      // 需要返回格式： [page_id1, page_id2]
      const quotedInfo = selectedPages.map(page => page.id);

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/slide/${outline.id}/save_quoted_info/`,
        { quoted_info: quotedInfo },
        {
          headers: { 'X-CSRFToken': csrfToken },
          withCredentials: true
        }
      );

      // 可以添加保存成功的提示
    } catch (error) {
      console.error('Failed to save selected pages:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingModal isOpen={true} task="加载中" status="正在获取章节和页面数据..." error={false} onClose={() => {}} />;
  }

  return (
    <div className="flex flex-col h-full w-full">

      <div className="flex gap-x-4 grow w-full overflow-y-hidden">
        {/* 主内容区 - 左右两列 */}
        <div className="flex overflow-hidden grow bg-white rounded shadow-sm border border-gray-300">
          {/* 左侧章节列表 */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-gray-50">
            <div className="p-4">
              <h3 className="font-medium mb-3">章节列表</h3>
              {Object.keys(sections).length === 0 ? (
                <p className="text-sm text-gray-500 italic">无章节数据</p>
              ) : (
                <ul className="space-y-1">
                  {/* 对于 page 长度为 0 的不显示 */}
                  {Object.keys(sections).filter(sectionName => sections[sectionName].length > 0).map(sectionName => (
                    <li key={sectionName}>
                      <button
                        className={`w-full flex items-center justify-between p-3 text-left rounded-md shadow-sm hover:bg-gray-100 ${expandedSection === sectionName ? 'bg-blue-50' : 'bg-white'}`}
                        onClick={(e) => toggleSection(e, sectionName)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSectionAllSelected(sectionName)}
                            // indeterminate={isSectionPartiallySelected(sectionName)}
                            onChange={() => toggleSectionAll(sectionName)}
                            // onChange={()=>{}}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-900">{sectionName}</span>

                        </div>
                        <div>
                          <span className="text-xs text-blue-500">
                            {isSectionSelectedCount(sectionName)}
                          </span>
                          <span className="text-xs text-gray-500">
                            /{sections[sectionName].length} 页
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 右侧页面列表 */}
          <div className="w-2/3 overflow-y-auto p-4">
            {expandedSection ? (
              <>{
                <div>
                  <h3 className="font-medium mb-3">
                    页面列表
                  </h3>
                  <ul className="space-y-2">
                    {sections[expandedSection]?.map(page => (
                      <li 
                        key={page.id}
                        onClick={(e) => togglePage(e, page.id)}
                      >
                        <div className="flex items-center p-3 bg-white rounded-md shadow-sm hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={`page-${page.id}`}
                            checked={selectedPages.filter(p => p.id === page.id).length > 0 || false}
                            // onChange={() => togglePage(page.id)}
                            onChange={() =>{}}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            // onClick={(e) =>{e.preventDefault();}}
                          />
                          <label
                            htmlFor={`page-${page.id}`}
                            className="ml-2 flex-1 text-sm text-gray-900"
                          >
                            {page.name}
                          </label>
                          <span className="text-xs text-gray-500">ID: {page.id}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              }</>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-500 italic">
                请选择一个章节查看页面
              </div>
            )}
          </div>
        </div>

        {/* 选中页面区 */}
        <div className="flex flex-1 overflow-hidden bg-white rounded shadow-sm border border-gray-300 w-1/3">
          <div className="p-4 w-full">
            <h3 className="font-medium mb-3">
              已选中页面
            </h3>
            {/* 根据 selectedPages 来显示选中的文章，可以删除 */}
            <div className="space-y-2 w-full">
            {selectedPages.map(page => (
              <div 
                key={page.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm hover:bg-red-50 cursor-pointer group"
                onClick={() => togglePage(null, page.id)}
              >
                {/* 删除图标 */}
                <div className="flex items-center gap-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="text-sm text-gray-900 group-hover:text-red-500 group-hover:line-through">{page.name}</span>
                </div>
                <span className="text-xs text-gray-500 group-hover:text-red-500">ID: {page.id}</span>
              </div>
            ))}
            </div>

          </div>
        </div>
      </div>

      {/* 保存 */}
      <div className="pt-4 flex justify-end items-center">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
          onClick={handleSave}
          disabled={saveLoading}
        >
          {saveLoading ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
};