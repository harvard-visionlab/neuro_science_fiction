x=[ 0.7040    0.1240    0.7600    0.6970    0.2890
    0.7610    0.1530    0.7630    0.7490    0.3050
    0.8320    0.6320    0.2770    0.1330    0.1890
    0.3040    0.5590    0.1270    0.1190    0.0350
    0.2660    0.1510    0.5090    0.2080    0.7570 ]

y=[0.550
0.591
0.498
0.320
0.579]

bb = glmfit(x,y,[],'constant','off')

bb = glmfitmulti(x,y,[],'constant','off')

sw=ones(size(y))
[b,R] = wfitGREZ(y, x, sw);







iter = 0;
iterLim = 100;
warned = false;
seps = sqrt(eps);
convcrit = 1e-6;

b = zeros(p,size(y,2),dataClass);

% Enforce limits on mu to guard against an inverse link that doesn't map into
% the support of the distribution.
switch distr
case 'binomial'
    % mu is a probability, so order one is the natural scale, and eps is a
    % reasonable lower limit on that scale (plus it's symmetric).
    muLims = [eps(dataClass) 1-eps(dataClass)];
case {'poisson' 'gamma' 'inverse gaussian'}
    % Here we don't know the natural scale for mu, so make the lower limit
    % small.  This choice keeps mu^4 from underflowing.  No upper limit.
    muLims = realmin(dataClass).^.25;
end

while iter <= iterLim
    iter = iter+1;

    keyboard;
    
    % Compute adjusted dependent variable for least squares fit
    deta = dlinkFun(mu);
    z = eta + (y - mu) .* deta;

    % Compute IRLS weights the inverse of the variance function
    sqrtw = sqrt(pwts) ./ (abs(deta) .* sqrtvarFun(mu));

    % If the weights have an enormous range, we won't be able to do IRLS very
    % well.  The prior weights may be bad, or the fitted mu's may have too
    % wide a range, which is probably because the data do as well, or because
    % the link function is trying to go outside the distribution's support.
    wtol = max(sqrtw)*eps(dataClass)^(2/3);
    t = (sqrtw < repmat(wtol,[size(sqrtw,1) 1]));
    if any(t)
        t = t & (sqrtw ~= 0);
        if any(t)
            sqrtw(t) = wtol;
            if ~warned
                warning('stats:glmfit:BadScaling', ...
                       ['Weights are ill-conditioned.   Data may be badly ' ...
                        'scaled, or\nthe link function may be inappropriate.']);
            end
            warned = true;
        end
    end

    % Compute coefficient estimates for this iteration - the IRLS step
    b_old = b;
    [b,R] = wfit(z - offset, x, sqrtw);

    % Form current linear predictor, including offset
    eta = offset + x * b;

    % Compute predicted mean using inverse link function
    mu = ilinkFun(eta);

    % Force mean in bounds, in case the link function is a wacky choice
    switch distr
    case 'binomial'
        if any(mu < muLims(1) | muLims(2) < mu)
        mu = max(min(mu,muLims(2)),muLims(1));
        end
    case {'poisson' 'gamma' 'inverse gaussian'}
        if any(mu < muLims(1))
        mu = max(mu,muLims(1));
        end
    end

    % Check stopping conditions
    if (~any(abs(b-b_old) > convcrit * max(seps, abs(b_old)))), break; end
end

