function step2_compare2Mitchell(teamName)
% step2_compare2Mitchell('bayesianmath')

teamName = lower(teamName);
addpath('helper');

% find feature set for this team
featureSet = subdir(fullfile('Results-BrainPrediction',['*' teamName '*']))
assert(length(featureSet)==1,'Oops, problem finding your data file.');
featureSet=featureSet.name
parts = strsplit(featureSet,filesep);
teamYear = parts{2};

%% do comparison/visualization

scoring = 'individual';
method = 'voxelglm';
numVoxels = 500;

% choose a feature set 
% featureSet=[teamName 'Features.mat'];

% load mitchell's data
teams{1}='MitchellSemanticFeatures';
teams{2}=teamName;

yy=[];
ee=[];
YY=[];
for i=1:length(teams)
    fileName = subdir(fullfile('Results-BrainPrediction',['*' teams{i} '*' scoring '*' method '*' num2str(numVoxels) '*']))
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
set(gcf,'Name',sprintf('%s',['Performance across all 1770 pairs!']));

for i=1:length(teams)
    text(i-.12,.55,sprintf('%3.4f',yy(i)),'FontName','Helvetica','FontSize',fontSize);
end



