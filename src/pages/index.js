import React, { useEffect } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import MatrixRain from '@site/src/components/MatrixRain';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={styles.bgWrapper}>
        <MatrixRain />
      </div>
      <div className={clsx('container', styles.heroContainer)}>
        <div className={styles.heroTextWrapper}>
          <Heading as="h1" className="hero__title">
            Covertia Core
          </Heading>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
        </div>
        <div className={styles.heroButtonWrapper}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/General Information">
            Get Started with Covertia
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  useEffect(() => {
    // Add custom class to body when homepage mounts
    document.body.classList.add('homepage-layout');
    return () => {
      // Clean up class when homepage unmounts
      document.body.classList.remove('homepage-layout');
    };
  }, []);

  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
    </Layout>
  );
}
