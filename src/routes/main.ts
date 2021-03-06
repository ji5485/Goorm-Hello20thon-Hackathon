import Challenge from '../models/Challenge';
import moment from 'moment';

export const main = async (ctx: any) => {
  const { user } = ctx.request;

  if (user) {
    let challenges;

    try {
      challenges = await Challenge.findAll({ where: { user_id: user.id } });

      const challenge_list = await Promise.all(
        challenges.map(async challenge => {
          const { id, name, achievement } = challenge;
          const challenge_group: any = await challenge.$get('challenge_group');

          return {
            id,
            name,
            achievement,
            start_date: challenge_group.start_date,
          };
        }),
      );

      await ctx.render('secondMain', {
        user,
        challenge_list,
        moment,
        active: 'Home',
      });
    } catch (e) {
      ctx.throw(500, e);
    }
  } else await ctx.render('firstMain', { active: 'Home' });
};

export const login = async (ctx: any) => {
  await ctx.render('login');
};

export const graph = async (ctx: any) => {
  const { user } = ctx.request;
  let challenges;

  try {
    challenges = await Challenge.findAll({ where: { user_id: user.id } });

    const challenge_list = await Promise.all(
      challenges.map(async challenge => {
        const { id, achievement } = challenge;

        return {
          id,
          achievement,
        };
      }),
    );

    await ctx.render('graph', {
      user,
      challenge_list,
      active: 'Graph',
    });
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const refund = async (ctx: any) => {
  const { user } = ctx.request;
  let challenges;

  try {
    challenges = await Challenge.findAll({ where: { user_id: user.id } });

    const challenge_list = await Promise.all(
      challenges.map(async challenge => {
        const { id, name, achievement } = challenge;
        const challenge_group: any = await challenge.$get('challenge_group');

        return {
          id,
          name,
          achievement,
          start_date: challenge_group.start_date,
          price: challenge_group.price,
        };
      }),
    );

    await ctx.render('refund', {
      user,
      challenge_list,
      moment,
      active: 'Refund',
    });
  } catch (e) {
    ctx.throw(500, e);
  }
};
