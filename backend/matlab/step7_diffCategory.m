function step7_diffCategory(teamName,whichData)
% step7_diffCategory('dopaminemachine','BrainPrediction')
% step7_diffCategory('dopaminemachine','MindReading')
if nargin<2
    whichData = 'BrainPrediction';
end

addpath('helper');

% find feature set for this team
teamName = lower(teamName);
featureSet = subdir(fullfile(['Results-' whichData],['*' teamName '*500*']))
assert(length(featureSet)==1,'Oops, problem finding your data file.');
featureSet=featureSet.name
parts = strsplit(featureSet,filesep());
teamYear = parts{2};

% set some preferences
if (strcmp(whichData,'BrainPrediction'))
	scoring = 'individual';  
else
    scoring = 'combo';  
end
method = 'voxelglm';
numVoxels = 500;

%% do comparison/visualization

% load mitchell's data
teams{1}='MitchellSemantic';
teams{2}=teamName;

yy=[];
ee=[];
YY=[];
for i=1:length(teams)
    fileName = subdir(fullfile(['Results-' whichData],['*' teams{i} '*' scoring '*' method '*' num2str(numVoxels) '*']))
    assert(length(fileName)==1,'Oops, problem finding your data file.');
    fileName=fileName.name
    load(fileName);
    yy(1,i)=Results.ave_accuracyDiffCat;
    ee(1,i)=std(Results.accuracyDiffCat)/sqrt(length(Results.accuracyDiffCat));
    YY(:,i)=Results.accuracyDiffCat';
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
set(gcf,'Name',sprintf('%s',[whichData ', for pairs items from the different categories']));

for i=1:length(teams)
    text(i-.12,.55,sprintf('%3.3f',yy(i)),'FontName','Helvetica','FontSize',fontSize);
end