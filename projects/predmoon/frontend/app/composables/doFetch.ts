export const doFetch = async (url: string, opts) => {
  // const { openDialog } = $(dialogStore())

  try {
    const rz = await $fetch(url, opts);
    return rz;
  } catch (e) {
    console.error("API Error:", e);
    // const errorMessage = e.data?.message
    //   || e.response?._data?.message
    //   || 'Request Failed'
    // openDialog('Error', {title: 'Error', message: errorMessage})
    throw e;
  }
};
