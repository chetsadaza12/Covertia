import React from 'react';
import {
  useDocById,
  findFirstSidebarItemLink,
} from '@docusaurus/plugin-content-docs/client';
import {
  extractLeadingEmoji,
  useDocCardDescriptionCategoryItemsPlural,
} from '@docusaurus/theme-common/internal';
import isInternalUrl from '@docusaurus/isInternalUrl';
import Layout from '@theme/DocCard/Layout';
import iconStyles from './Heading/Icon/styles.module.css';
function getFallbackEmojiIcon(item) {
  if (item.type === 'category') {
    return '🗃';
  }
  return isInternalUrl(item.href) ? '📄️' : '🔗';
}
function getIconTitleProps(item) {
  const extracted = extractLeadingEmoji(item.label);
  let emoji = extracted.emoji ?? getFallbackEmojiIcon(item);
  if (item.label === 'Profile' || item.label === 'โปรไฟล์') {
    emoji = (
      <img
        src="/Gif/profile.gif"
        className={iconStyles.profileGifIcon}
        alt=""
      />
    );
  } else if (item.label === 'Workflows' || item.label === 'เวิร์กโฟลว์') {
    emoji = (
      <img
        src="/Gif/Workflows.gif"
        className={iconStyles.workflowsGifIcon}
        alt=""
      />
    );
  } else if (item.label === 'Tasks' || item.label === 'งาน' || item.label === 'แทสก์') {
    emoji = (
      <img
        src="/Gif/Tasks.gif"
        className={iconStyles.tasksGifIcon}
        alt=""
      />
    );
  } else if (item.label === 'Database' || item.label === 'ฐานข้อมูล' || item.label === 'ดาต้าเบส') {
    emoji = (
      <img
        src="/Gif/database.gif"
        className={iconStyles.databaseGifIcon}
        alt=""
      />
    );
  } else if (item.label === 'Logs' || item.label === 'บันทึกการทำงาน' || item.label === 'ล็อก') {
    emoji = (
      <img
        src="/Gif/Logs.gif"
        className={iconStyles.logsGifIcon}
        alt=""
      />
    );
  } else if (item.label === 'Extension' || item.label === 'ส่วนขยาย' || item.label === 'เอ็กซ์เทนชัน') {
    emoji = (
      <img
        src="/Gif/Extension.gif"
        className={iconStyles.extensionGifIcon}
        alt=""
      />
    );
  } else if (item.label === 'Settings' || item.label === 'การตั้งค่า' || item.label === 'เซตติ้ง') {
    emoji = (
      <img
        src="/Gif/settings.gif"
        className={iconStyles.settingsGifIcon}
        alt=""
      />
    );
  }
  return {
    icon: emoji,
    title: extracted.rest.trim(),
  };
}
function CardCategory({item}) {
  const href = findFirstSidebarItemLink(item);
  const categoryItemsPlural = useDocCardDescriptionCategoryItemsPlural();
  // Unexpected: categories that don't have a link have been filtered upfront
  if (!href) {
    return null;
  }
  return (
    <Layout
      item={item}
      className={item.className}
      href={href}
      description={item.description ?? categoryItemsPlural(item.items.length)}
      {...getIconTitleProps(item)}
    />
  );
}
function CardLink({item}) {
  const doc = useDocById(item.docId ?? undefined);
  return (
    <Layout
      item={item}
      className={item.className}
      href={item.href}
      description={item.description ?? doc?.description}
      {...getIconTitleProps(item)}
    />
  );
}
export default function DocCard({item}) {
  switch (item.type) {
    case 'link':
      return <CardLink item={item} />;
    case 'category':
      return <CardCategory item={item} />;
    default:
      throw new Error(`unknown item type ${JSON.stringify(item)}`);
  }
}
