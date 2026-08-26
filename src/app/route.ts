import { NextResponse } from 'next/server';

const SHOPEE_URL = 'https://shopee.vn/';

const GET = async () => {
    return NextResponse.redirect(SHOPEE_URL);
};

export { GET };
