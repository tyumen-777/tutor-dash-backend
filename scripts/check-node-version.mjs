const minimum = {
  major: 22,
  minor: 22,
  patch: 1,
};

const [major, minor, patch] = process.versions.node.split('.').map(Number);

const isSupported =
  major > minimum.major ||
  (major === minimum.major &&
    (minor > minimum.minor ||
      (minor === minimum.minor && patch >= minimum.patch)));

if (!isSupported) {
  console.error(
    `Node.js >= ${minimum.major}.${minimum.minor}.${minimum.patch} is required. Current version: ${process.versions.node}.`,
  );
  console.error('Run `nvm use` from the backend directory, then try again.');
  process.exit(1);
}
