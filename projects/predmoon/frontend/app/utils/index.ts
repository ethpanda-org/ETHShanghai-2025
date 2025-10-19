
export const scrollToElement = (id: any) => {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
};
