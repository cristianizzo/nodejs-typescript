export const getRandomAvatar = () => {
  const avatars = ['camel', 'cobra', 'cougar', 'eagle', 'rattlesnake', 'vulture'];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];
  return `avatars/${avatar}.png`;
};
