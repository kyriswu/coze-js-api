import axios from 'axios';
import fs from 'fs';
import path from 'path';

const filetool = {
    isSupportedFileType: function (contentType) {
        try {
            // 检查 contentType 是否为 null 或 undefined
            if (!contentType ||
                this.is_audio(contentType) ||
                this.is_video(contentType) ||
            ) {
                return false;
            }
            if (this.is_pdf(contentType) ||
                this.is_word(contentType) ||
                this.is_excel(contentType) ||
                this.is_ppt(contentType) ||
                this.is_txt(contentType) ||
                this.is_csv(contentType)) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking file type:', error.message);
            return false;
        }
    },
    is_html: function (contentType) {
        try {
            // 检查 contentType 是否包含 'text/html'
            return contentType.toLowerCase().includes('text/html');
        } catch (error) {
            console.error('Error checking HTML type:', error.message);
            return false;
        }
    },
    is_pdf: function (contentType) {
        try {
            // 检查 contentType 是否包含 'application/pdf'
            return contentType.toLowerCase().includes('application/pdf');     
        } catch (error) {
            console.error('Error checking PDF type:', error.message);
            return false;
        }
    },
    is_image: function (contentType) {
        try {
            // MIME类型到文件扩展名的映射
            const mimeToExtension = {
                'image/jpeg': 'jpg',
                'image/png': 'png', 
                'image/gif': 'gif',
                'image/bmp': 'bmp',
                'image/webp': 'webp',
                'image/tiff': 'tiff',
                'image/svg+xml': 'svg',
                'image/x-icon': 'ico',
                'image/heic': 'heic',
                'image/heif': 'heif',
                'image/avif': 'avif',
            };  
            // 查找匹配的图片类型
            const matchedType = Object.keys(mimeToExtension).find(type => 
                contentType.toLowerCase().includes(type)
            );
            return !!matchedType
        } catch (error) {
            console.error('Error checking image type:', error.message);
            return false
        }
    },
    is_word: function (contentType) {
        try {
            // 检查 contentType 是否包含 'application/msword' 或 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            return contentType.toLowerCase().includes('application/msword') || 
                   contentType.toLowerCase().includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        } catch (error) {
            console.error('Error checking Word type:', error.message);
            return false;
        }   
    },
    is_excel: function (contentType) {
        try {       
            // 检查 contentType 是否包含 'application/vnd.ms-excel' 或 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            return contentType.toLowerCase().includes('application/vnd.ms-excel') ||
                   contentType.toLowerCase().includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } catch (error) {
            console.error('Error checking Excel type:', error.message);
            return false;
        }
    },
    is_ppt: function (contentType) {
        try {
            // 检查 contentType 是否包含 'application/vnd.ms-powerpoint' 或 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            return contentType.toLowerCase().includes('application/vnd.ms-powerpoint') ||
                   contentType.toLowerCase().includes('application/vnd.openxmlformats-officedocument.presentationml.presentation');
        } catch (error) {
            console.error('Error checking PPT type:', error.message);       
            return false;
        }
    },
    is_txt: function (contentType) {
        try {   
            // 检查 contentType 是否包含 'text/plain'   
            return contentType.toLowerCase().includes('text/plain');
        } catch (error) {
            console.error('Error checking TXT type:', error.message);
            return false;
        }
    },
    is_csv: function (contentType) {
        try {
            // 检查 contentType 是否包含 'text/csv' 或 'application/csv 
            return contentType.toLowerCase().includes('text/csv') ||
                   contentType.toLowerCase().includes('application/csv') ||
                   contentType.toLowerCase().includes('application/vnd.ms-excel') ||
                   contentType.toLowerCase().includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } catch (error) {
            console.error('Error checking CSV type:', error.message);
            return false;
        }
    },
    is_audio: async function (contentType) {
        try {
            // MIME类型到文件扩展名的映射
            const mimeToExtension = {
                'audio/mpeg': 'mp3',
                'audio/mp4': 'm4a',
                'audio/wav': 'wav',
                'audio/x-wav': 'wav',
                'audio/ogg': 'ogg',
                'audio/aac': 'aac',
                'audio/flac': 'flac',
                'audio/webm': 'webm',
            };
            
            // 查找匹配的音频类型
            const matchedType = Object.keys(mimeToExtension).find(type => 
                contentType.toLowerCase().includes(type)
            );
            
            return !!matchedType

        } catch (error) {

            console.error('Error getting audio type:', error.message);
            return false

        }
    },
    is_video: function (contentType) {
            try {
    
                // MIME类型到文件扩展名的映射
                const mimeToExtension = {
                    'video/mp4': 'mp4',
                    'video/mpeg': 'mpeg',
                    'video/quicktime': 'mov',
                    'video/webm': 'webm',
                };
                
                // 查找匹配的视频类型
                const matchedType = Object.keys(mimeToExtension).find(type => 
                    contentType.toLowerCase().includes(type)
                )
                
                return !!matchedType
            } catch (error) {
                console.error('Error getting video type:', error.message);
                return false
            }
        },
};

export default filetool;