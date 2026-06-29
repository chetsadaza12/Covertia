import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Isolated Profiles',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Create and manage multiple isolated browser profiles. Each profile acts
        as a distinct device environment with customized fingerprints to prevent tracking.
      </>
    ),
  },
  {
    title: 'Advanced Automation',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Design, import, and schedule custom workflow scripts. Run automation tasks,
        auto-logins, and sequential browser operations concurrently.
      </>
    ),
  },
  {
    title: 'Smart Proxy Routing',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Route profile connections securely through static or rotating SOCKS5/HTTP proxies
        with region consistency checks to bypass restrictions.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
