function plot_bar_errorbars(handles,yy,ee)
% handles to bars
% yy values of bars
% ee values of error bars

ymax=0;
for i=1:numbars
    x =get(get(handles.bars(i),'children'), 'xdata');
    x = mean(x([1 3],:));
    handles.errors(i) = errorbar(x, yy(:,i), ee(:,i), 'k', 'linestyle', 'none', 'linewidth', 2);
    ymax = max([ymax; yy(:,i)+ee(:,i)]);
end

error_sides = 2;
if error_sides == 1
    set(gca,'children', flipud(get(gca,'children')));
end