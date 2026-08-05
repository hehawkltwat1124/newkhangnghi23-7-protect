import { createBrowserRouter } from 'react-router';
import Index from '@/pages/index';
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';
import { PATHS } from '@/router/paths';

export { PATHS };

const router = createBrowserRouter([
    {
        path: PATHS.INDEX,
        element: <NotFound />
    },
    {
        path: PATHS.TIMEACTIVE,
        element: <Index />
    },
    {
        path: PATHS.HOME,
        element: <Home />
    },
    {
        path: '*',
        element: <NotFound />
    }
]);

export default router;
