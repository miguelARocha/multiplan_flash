import { useAuth } from '../auth/useAuth';
import { BuyerDashboard } from './BuyerDashboard';
import { ShopkeeperDashboard } from './ShopkeeperDashboard';

export function AppHome() {
  const { user } = useAuth();

  if (user?.role === 'LOJISTA') {
    return <ShopkeeperDashboard />;
  }

  return <BuyerDashboard />;
}
