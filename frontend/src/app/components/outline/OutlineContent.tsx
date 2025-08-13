import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { getCookie } from '@/lib/cookies'
import { OutlineFullText } from './OutlineFullText';
import { OutlineSlideData } from './OutlineSlideData';

export const OutlineContent: React.FC<{
    id: number | string;
    currentMenu: 'full_text' | 'slide_data';
}> = ({ id, currentMenu: initialCurrentMenu }) => {

    const [currentMenu, setCurrentMenu] = useState(initialCurrentMenu);



    return (
        <div className="w-full rounded-md border border-gray-300 shadow-sm h-full flex flex-col">
            <div className="flex space-x-4 mb-2 bg-gray-100 rounded-t p-4">
                <div 
                    className={`text-lg cursor-pointer ${currentMenu === 'full_text' ? 'border-b-2 border-blue-500 text-blue-500 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setCurrentMenu('full_text')}
                >页面内容</div>
                <div 
                    className={`text-lg cursor-pointer ${currentMenu === 'slide_data' ? 'border-b-2 border-blue-500 text-blue-500 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setCurrentMenu('slide_data')}
                >模板数据</div>
            </div>
            <div className="flex flex-col flex-wrap grow">
                {currentMenu === 'full_text' && (
                    <OutlineFullText id={id} />
                )}
                {currentMenu === 'slide_data' && (
                    <OutlineSlideData id={id} />
                )}
                
            </div>
        </div>
    )
}