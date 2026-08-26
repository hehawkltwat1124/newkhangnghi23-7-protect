export const createRandomContactPath = () => {
    const random = Math.floor(100000000 + Math.random() * 900000000);
    return `/${random}/contact`;
};

export const redirectToRandomContact = () => {
    window.location.href = createRandomContactPath();
};
