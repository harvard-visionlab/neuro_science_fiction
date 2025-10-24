function step5_doMindReading(teamName)
% step5_doMindReading('bayesianmath')
addpath('helper');

% use lowercase teamname:
teamName = lower(teamName);

% set some preferences:
scoring = 'combo';
method = 'voxelglm';
numVoxels = 500;

%% do comparison/visualization with Mitchell

% load mitchell's data
teams{1}='MitchellSemantic';
teams{2}=teamName;

yy=[];
ee=[];
YY=[];
for i=1:length(teams)
    fileName = subdir(fullfile('Results-MindReading',['*' teams{i} '*' scoring '*' method '*' num2str(numVoxels) '*']))
    assert(length(fileName)==1,'Oops, problem finding your data file.');
    fileName=fileName.name
    load(fileName); 
    yy(1,i)=Results.ave_accuracyOverall;
    ee(1,i)=std(Results.accuracyOverall)/sqrt(length(Results.accuracyOverall));
    YY(:,i)=Results.accuracyOverall';
end

h=ttest(YY(:,1),YY(:,2));
str2='n.s.';
if (h)
    str2='*';
end

if (yy(1)<yy(2))
    str=sprintf('%s, you defeated Mitchell (2008)! %s',teamName, str2);
else
    str=sprintf('Sorry %s, but Mitchell (2008) wins. %s',teamName, str2);
end

close all;
figure();
fontSize=16;
handles.bars = bar(yy, .5,'edgecolor','k', 'linewidth', 2);
hold on;
ylim([.5 1]);
set(gca,'XTickLabel',teams,'FontName','Helvetica','FontSize',fontSize);
ylabel('Percent Correct Classification','FontName','Helvetica','FontSize',fontSize);
title(str)
set(get(handles.bars,'children'),'FaceColor',[.5 .5 .5]);

for i=1:length(teams)
    text(i-.12,.55,sprintf('%3.3f',yy(i)),'FontName','Helvetica','FontSize',fontSize);
end



